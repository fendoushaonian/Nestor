import { BaseEntity } from '@nestor/shared';
import { Column, Entity, Index } from 'typeorm';

/**
 * 卡密兑换记录: 每次成功兑换写一条, 用于审计与防刷分析。
 */
@Entity('card_redeem_logs')
export class CardRedeemLog extends BaseEntity {
  @Index()
  @Column({ name: 'card_id', type: 'uuid' })
  cardId!: string;

  @Index()
  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ length: 64, nullable: true })
  ip?: string;

  @Column({ length: 255, nullable: true })
  device?: string;

  @Column({ name: 'redeemed_at' })
  redeemedAt!: Date;
}
