import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@nestor/shared';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { Configuration } from '../../../config/configuration';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { CacheService } from '../../redis/cache.service';
import { AuthService } from '../auth.service';
import { Role } from '../entities/role.entity';
import { UserIdentity } from '../entities/user-identity.entity';
import { User, UserStatus } from '../entities/user.entity';
import { IssuedTokens } from '../token.service';
import { OAuthProvidersRegistry } from './oauth-providers.registry';
import { OAuthProvider, OAuthUserProfile } from './providers/types';

const STATE_TTL = 600; // state 有效期 10 分钟
const DEFAULT_ROLE_CODE = 'user';

export interface OAuthAuthorizeResult {
  provider: string;
  state: string;
  url: string;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);
  /** Redis 未启用时的 state 兜底(单实例内存, 带过期)。 */
  private readonly localStates = new Map<string, number>();

  constructor(
    private readonly registry: OAuthProvidersRegistry,
    private readonly cache: CacheService,
    private readonly auth: AuthService,
    private readonly dataSource: DataSource,
    private readonly config: ConfigService<Configuration, true>,
    @InjectRepository(UserIdentity) private readonly identities: Repository<UserIdentity>,
  ) {}

  enabledProviders(): string[] {
    return this.registry.enabledNames();
  }

  successRedirect(): string | undefined {
    return this.config.get('oauth', { infer: true }).successRedirect;
  }

  /** 生成授权跳转地址(含一次性 state)。 */
  async authorize(providerName: string): Promise<OAuthAuthorizeResult> {
    const provider = this.requireProvider(providerName);
    const state = `${provider.name}:${randomUUID()}`;
    await this.saveState(state);
    return { provider: provider.name, state, url: provider.getAuthorizationUrl(state) };
  }

  /** 处理回调: 校验 state → 换取资料 → 找到/创建用户并绑定 → 签发令牌。 */
  async handleCallback(
    providerName: string,
    code: string,
    state: string | undefined,
  ): Promise<IssuedTokens> {
    const provider = this.requireProvider(providerName);
    if (!state || !(await this.consumeState(state))) {
      throw new BusinessException(ErrorCode.OAUTH_STATE_INVALID, 'state 校验失败, 请重新发起登录');
    }

    let profile: OAuthUserProfile;
    try {
      profile = await provider.exchangeCode(code);
    } catch (err) {
      this.logger.warn(
        `OAuth ${provider.name} 换取用户资料失败: ${err instanceof Error ? err.message : String(err)}`,
      );
      throw new BusinessException(ErrorCode.OAUTH_EXCHANGE_FAILED, '第三方登录失败, 请重试');
    }

    const userId = await this.findOrCreateUser(provider.name, profile);
    return this.auth.issueTokensForUser(userId);
  }

  private requireProvider(name: string): OAuthProvider {
    const provider = this.registry.get(name);
    if (!provider || !provider.isConfigured()) {
      throw new BusinessException(ErrorCode.OAUTH_PROVIDER_DISABLED, `第三方登录未启用: ${name}`);
    }
    return provider;
  }

  /**
   * 身份归并策略:
   *  1) 已绑定 (provider, providerUserId) → 直接登录;
   *  2) 资料带可信邮箱且系统已有同邮箱用户 → 绑定到该用户;
   *  3) 否则新建用户并绑定身份。
   */
  private async findOrCreateUser(provider: string, profile: OAuthUserProfile): Promise<string> {
    const existing = await this.identities.findOne({
      where: { provider, providerUserId: profile.providerUserId },
    });
    if (existing) return existing.userId;

    return this.dataSource.transaction(async (manager) => {
      // double-check 并发下避免重复创建
      const again = await manager.findOne(UserIdentity, {
        where: { provider, providerUserId: profile.providerUserId },
      });
      if (again) return again.userId;

      let user = profile.email
        ? await manager.findOne(User, { where: { email: profile.email } })
        : null;

      if (!user) {
        const role = await manager.findOne(Role, { where: { code: DEFAULT_ROLE_CODE } });
        const passwordHash = await bcrypt.hash(randomUUID(), 10);
        user = manager.create(User, {
          username: await this.uniqueUsername(manager, provider, profile),
          email: profile.email,
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl,
          passwordHash,
          status: UserStatus.ACTIVE,
          roles: role ? [role] : [],
        });
        user = await manager.save(user);
      }

      await manager.save(
        manager.create(UserIdentity, {
          userId: user.id,
          provider,
          providerUserId: profile.providerUserId,
          unionId: profile.unionId,
          raw: profile.raw,
        }),
      );
      return user.id;
    });
  }

  /** 生成不冲突的用户名: 基于昵称/标识, 冲突则追加随机后缀。 */
  private async uniqueUsername(
    manager: EntityManager,
    provider: string,
    profile: OAuthUserProfile,
  ): Promise<string> {
    const base =
      (profile.nickname ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '')
        .slice(0, 24) || `${provider}_${profile.providerUserId.slice(0, 12)}`;
    let candidate = base;
    for (let i = 0; i < 5; i++) {
      const taken = await manager.findOne(User, {
        where: { username: candidate },
        withDeleted: true,
      });
      if (!taken) return candidate;
      candidate = `${base}_${randomUUID().slice(0, 6)}`;
    }
    return `${provider}_${randomUUID().slice(0, 12)}`;
  }

  private async saveState(state: string): Promise<void> {
    if (this.cache.available) {
      await this.cache.set(`oauth:state:${state}`, 1, STATE_TTL);
    } else {
      this.localStates.set(state, Date.now() + STATE_TTL * 1000);
    }
  }

  /** 校验并一次性消费 state(防 CSRF / 重放)。 */
  private async consumeState(state: string): Promise<boolean> {
    const client = this.cache.raw;
    if (client) {
      // 原子删除: DEL 返回被删 key 数, 并发下仅一个请求得到 1, 杜绝 exists+del 的 TOCTOU 竞态。
      const deleted = await client.del(`oauth:state:${state}`);
      return deleted > 0;
    }
    // 内存兜底路径: Node 单线程, await 间不被打断, get+delete 天然安全。
    const exp = this.localStates.get(state);
    this.localStates.delete(state);
    return exp !== undefined && exp > Date.now();
  }
}
