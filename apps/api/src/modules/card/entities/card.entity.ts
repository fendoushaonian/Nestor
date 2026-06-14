import { BaseEntity } from '@nestor/core';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { CardBatch } from './card-batch.entity';

export enum CardStatus {
  UNUSED = 'unused',
  USED = 'used',
  DISABLED = 'disabled',
  EXPIRED = 'expired',
}

/**
 * 卡密: code 公开可见, secret 为校验密钥。状态机由后端控制, 兑换走事务防并发。
 */
@Entity('cards')
export class Card extends BaseEntity {
  @Column({ name: 'batch_id', type: 'uuid' })
  batchId!: string;

  @ManyToOne(() => CardBatch)
  @JoinColumn({ name: 'batch_id' })
  batch?: CardBatch;

  /** 卡号 (展示用) */
  @Index({ unique: true })
  @Column({ length: 64 })
  code!: string;

  /** 卡密 (校验用) */
  @Column({ length: 128 })
  secret!: string;

  @Column({ type: 'varchar', length: 16, default: CardStatus.UNUSED })
  status!: CardStatus;

  /** 兑换后绑定的用户 */
  @Column({ name: 'bound_user_id', type: 'uuid', nullable: true })
  boundUserId?: string;

  @Column({ name: 'used_at', nullable: true })
  usedAt?: Date;

  /** 卡密过期时间 (激活时按 batch.expireDays 计算) */
  @Column({ name: 'expire_at', nullable: true })
  expireAt?: Date;
}
