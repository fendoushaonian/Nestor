import { BaseEntity } from '@nestor/shared';
import { Column, Entity, Index } from 'typeorm';

/**
 * 用户权益: 卡密兑换/购买后发放给用户的实际权益 (会员有效期 / 剩余额度)。
 */
@Entity('user_entitlements')
export class UserEntitlement extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string;

  /** 权益来源卡密 id */
  @Column({ name: 'source_card_id', type: 'uuid', nullable: true })
  sourceCardId?: string;

  @Column({ name: 'start_at', nullable: true })
  startAt?: Date;

  @Column({ name: 'end_at', nullable: true })
  endAt?: Date;

  /** 剩余额度 (QUOTA 类型使用) */
  @Column({ name: 'remaining_quota', type: 'int', default: 0 })
  remainingQuota!: number;
}
