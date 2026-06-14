import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@nestor/shared';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { LoginLog } from '../system/entities/login-log.entity';
import { Role } from './entities/role.entity';
import { User, UserStatus } from './entities/user.entity';
import { AuthUser } from './auth.types';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { IssuedTokens, TokenService } from './token.service';

const BCRYPT_ROUNDS = 10;
const DEFAULT_ROLE_CODE = 'user';

export interface LoginContext {
  ip?: string;
  userAgent?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(LoginLog) private readonly loginLogs: Repository<LoginLog>,
    private readonly tokens: TokenService,
  ) {}

  async register(dto: RegisterDto): Promise<IssuedTokens> {
    const exists = await this.users.findOne({
      where: [{ username: dto.username }, ...(dto.email ? [{ email: dto.email }] : [])],
      withDeleted: true,
    });
    if (exists) {
      throw new BusinessException(ErrorCode.USER_EXISTS, '用户名或邮箱已被注册');
    }

    const passwordHash = await bcrypt.hash(dto.password, BCRYPT_ROUNDS);
    const defaultRole = await this.roles.findOne({ where: { code: DEFAULT_ROLE_CODE } });

    const user = this.users.create({
      username: dto.username,
      email: dto.email,
      nickname: dto.nickname,
      passwordHash,
      status: UserStatus.ACTIVE,
      roles: defaultRole ? [defaultRole] : [],
    });
    const saved = await this.users.save(user);

    return this.tokens.issueTokens(await this.toClaims(saved.id));
  }

  async login(dto: LoginDto, ctx: LoginContext): Promise<IssuedTokens> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.username = :id OR u.email = :id OR u.phone = :id', { id: dto.identifier })
      .getOne();

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      await this.writeLoginLog(ctx, dto.identifier, user?.id, false, '凭证错误');
      throw new BusinessException(ErrorCode.INVALID_CREDENTIALS, '用户名或密码错误');
    }
    if (user.status !== UserStatus.ACTIVE) {
      await this.writeLoginLog(ctx, dto.identifier, user.id, false, '账号被禁用');
      throw new BusinessException(ErrorCode.ACCOUNT_DISABLED, '账号已被禁用或锁定');
    }

    await this.writeLoginLog(ctx, user.username, user.id, true, '登录成功');
    return this.tokens.issueTokens(await this.toClaims(user.id));
  }

  async refresh(refreshToken: string): Promise<IssuedTokens> {
    let payload;
    try {
      payload = await this.tokens.verifyRefresh(refreshToken);
    } catch {
      throw new BusinessException(ErrorCode.TOKEN_INVALID, 'refreshToken 无效或已失效');
    }
    // 轮换: 旧 refresh 立即失效, 防重放
    await this.tokens.revokeRefresh(payload.sub, payload.jti);
    return this.tokens.issueTokens(await this.toClaims(payload.sub));
  }

  async logout(user: AuthUser): Promise<void> {
    await this.tokens.revokeAccess({ ...user, sub: user.id, type: 'access' }, user.exp);
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.users.findOne({
      where: { id: userId },
      relations: { roles: { permissions: true } },
    });
    if (!user) {
      throw new BusinessException(ErrorCode.USER_NOT_FOUND, '用户不存在');
    }
    return user;
  }

  /** 为指定用户签发令牌(第三方登录等复用登录后置流程)。 */
  async issueTokensForUser(userId: string): Promise<IssuedTokens> {
    return this.tokens.issueTokens(await this.toClaims(userId));
  }

  /** 加载用户的角色与权限编码, 组装进 token 载荷。 */
  private async toClaims(userId: string) {
    const user = await this.getProfile(userId);
    const roles = (user.roles ?? []).map((r) => r.code);
    const permissions = Array.from(
      new Set((user.roles ?? []).flatMap((r) => (r.permissions ?? []).map((p) => p.code))),
    );
    return { id: user.id, username: user.username, roles, permissions };
  }

  private async writeLoginLog(
    ctx: LoginContext,
    username: string,
    userId: string | undefined,
    success: boolean,
    message: string,
  ): Promise<void> {
    try {
      await this.loginLogs.save(
        this.loginLogs.create({
          userId,
          username,
          ip: ctx.ip,
          userAgent: ctx.userAgent,
          success,
          message,
        }),
      );
    } catch (err) {
      this.logger.warn(`写登录日志失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }
}
