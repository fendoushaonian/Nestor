import { Injectable } from '@nestjs/common';
import { ErrorCode } from '@nestor/shared';
import { DataSource, EntityManager } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { CacheService } from '../redis/cache.service';
import { redeemLockId } from './card-code.util';
import { CardBatch } from './entities/card-batch.entity';
import { CardRedeemLog } from './entities/card-redeem-log.entity';
import { Card, CardStatus } from './entities/card.entity';
import { Product, ProductType } from './entities/product.entity';
import { UserEntitlement } from './entities/user-entitlement.entity';

const REDIS_LOCK_TTL = 10;

export interface RedeemContext {
  ip?: string;
  device?: string;
}

export interface RedeemResult {
  cardId: string;
  productId?: string;
  entitlement: UserEntitlement;
}

@Injectable()
export class RedeemService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly cache: CacheService,
  ) {}

  /**
   * 兑换卡密。多层防并发:
   *  1) Redis 分布式锁 (启用时): 同一卡号同一时刻只放行一个请求;
   *  2) 数据库事务 + 行锁 (mysql/postgres);
   *  3) 状态条件原子更新 (所有库通用的最终防线):
   *     UPDATE cards SET status='used' WHERE id=? AND status='unused', 校验影响行数。
   */
  async redeem(
    code: string,
    secret: string,
    userId: string,
    ctx: RedeemContext,
  ): Promise<RedeemResult> {
    const lockKey = `card:redeem:lock:${code}`;
    const lockToken = redeemLockId();
    const locked = await this.acquireLock(lockKey, lockToken);
    if (!locked) {
      throw new BusinessException(ErrorCode.CARD_REDEEM_CONFLICT, '卡密正在被处理, 请稍后重试');
    }
    try {
      return await this.dataSource.transaction((manager) =>
        this.doRedeem(manager, code, secret, userId, ctx),
      );
    } finally {
      await this.releaseLock(lockKey, lockToken);
    }
  }

  private async doRedeem(
    manager: EntityManager,
    code: string,
    secret: string,
    userId: string,
    ctx: RedeemContext,
  ): Promise<RedeemResult> {
    const card = await this.lockCard(manager, code);
    if (!card) {
      throw new BusinessException(ErrorCode.CARD_NOT_FOUND, '卡密不存在');
    }
    if (card.secret !== secret) {
      throw new BusinessException(ErrorCode.CARD_SECRET_MISMATCH, '卡密校验失败');
    }
    if (card.status === CardStatus.USED) {
      throw new BusinessException(ErrorCode.CARD_ALREADY_USED, '卡密已被使用');
    }
    if (card.status === CardStatus.DISABLED) {
      throw new BusinessException(ErrorCode.CARD_DISABLED, '卡密已被禁用');
    }
    if (card.expireAt && card.expireAt.getTime() < Date.now()) {
      throw new BusinessException(ErrorCode.CARD_EXPIRED, '卡密已过期');
    }

    const batch = card.batchId
      ? await manager.findOne(CardBatch, { where: { id: card.batchId } })
      : null;
    const expireAt =
      batch && batch.expireDays > 0
        ? new Date(Date.now() + batch.expireDays * 86400_000)
        : undefined;

    // 通用最终防线: 仅当仍为 unused 时才置为 used, 影响行数必须为 1
    const update = await manager.update(
      Card,
      { id: card.id, status: CardStatus.UNUSED },
      { status: CardStatus.USED, boundUserId: userId, usedAt: new Date(), expireAt },
    );
    if (update.affected !== 1) {
      throw new BusinessException(ErrorCode.CARD_REDEEM_CONFLICT, '卡密已被使用');
    }

    const product = batch?.productId
      ? await manager.findOne(Product, { where: { id: batch.productId } })
      : null;
    const entitlement = await this.issueEntitlement(manager, userId, card.id, product);

    await manager.save(
      manager.create(CardRedeemLog, {
        cardId: card.id,
        userId,
        ip: ctx.ip,
        device: ctx.device,
        redeemedAt: new Date(),
      }),
    );

    return { cardId: card.id, productId: product?.id, entitlement };
  }

  /** 行锁加载卡密; sqlite 不支持 FOR UPDATE 时退化为普通查询 (sqlite 写串行, 仍安全)。 */
  private async lockCard(manager: EntityManager, code: string): Promise<Card | null> {
    const driver = manager.connection.options.type;
    const supportsRowLock = driver !== 'sqlite' && driver !== 'better-sqlite3';
    const qb = manager.createQueryBuilder(Card, 'c').where('c.code = :code', { code });
    if (supportsRowLock) {
      qb.setLock('pessimistic_write');
    }
    return qb.getOne();
  }

  /** 按商品类型发放/累加权益。 */
  private async issueEntitlement(
    manager: EntityManager,
    userId: string,
    cardId: string,
    product: Product | null,
  ): Promise<UserEntitlement> {
    const existing = product
      ? await manager.findOne(UserEntitlement, {
          where: { userId, productId: product.id },
          order: { createdAt: 'DESC' },
        })
      : null;

    const entitlement =
      existing ??
      manager.create(UserEntitlement, {
        userId,
        productId: product?.id,
        sourceCardId: cardId,
        remainingQuota: 0,
      });

    if (product?.type === ProductType.MEMBERSHIP) {
      const now = Date.now();
      const base =
        entitlement.endAt && entitlement.endAt.getTime() > now ? entitlement.endAt.getTime() : now;
      entitlement.startAt = entitlement.startAt ?? new Date();
      entitlement.endAt = new Date(base + product.durationDays * 86400_000);
    } else if (product?.type === ProductType.QUOTA) {
      entitlement.remainingQuota = (entitlement.remainingQuota ?? 0) + product.quota;
    } else {
      entitlement.startAt = entitlement.startAt ?? new Date();
    }
    entitlement.sourceCardId = cardId;

    return manager.save(entitlement);
  }

  private async acquireLock(key: string, token: string): Promise<boolean> {
    const client = this.cache.raw;
    if (!client) return true; // 未启用 Redis 时跳过, 依赖 DB 原子更新兜底
    // 存入唯一 token, 释放时校验, 避免误删他人持有的锁。
    const res = await client.set(key, token, 'EX', REDIS_LOCK_TTL, 'NX');
    return res === 'OK';
  }

  // 仅当锁仍为本次持有(token 匹配)时才删除, 原子执行避免竞态(锁超时后被他人重新获取的场景)。
  private static readonly RELEASE_LUA =
    "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";

  private async releaseLock(key: string, token: string): Promise<void> {
    const client = this.cache.raw;
    if (!client) return;
    await client.eval(RedeemService.RELEASE_LUA, 1, key, token);
  }
}
