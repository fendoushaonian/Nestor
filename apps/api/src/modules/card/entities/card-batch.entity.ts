import { BaseEntity } from '@nestor/shared';
import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';

/**
 * 卡密批次: 一次性生成一批卡密的元信息 (数量、对应权益、有效期)。
 */
@Entity('card_batches')
export class CardBatch extends BaseEntity {
  @Column({ length: 128 })
  name!: string;

  @Column({ name: 'product_id', type: 'uuid', nullable: true })
  productId?: string;

  @ManyToOne(() => Product, { nullable: true })
  @JoinColumn({ name: 'product_id' })
  product?: Product;

  /** 本批次卡密总数 */
  @Column({ type: 'int', default: 0 })
  total!: number;

  /** 卡密自激活起的有效天数, 0 表示永久 */
  @Column({ name: 'expire_days', type: 'int', default: 0 })
  expireDays!: number;

  /** 创建人 user id */
  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;

  @Column({ length: 255, nullable: true })
  remark?: string;
}
