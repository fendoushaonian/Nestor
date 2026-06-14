import { BaseEntity } from '@nestor/core';
import { Column, Entity } from 'typeorm';

export enum ProductType {
  /** 会员时长类 (按天) */
  MEMBERSHIP = 'membership',
  /** 额度类 (次数/点数) */
  QUOTA = 'quota',
  /** 一次性权限 */
  ONE_TIME = 'one_time',
}

@Entity('products')
export class Product extends BaseEntity {
  @Column({ length: 128 })
  name!: string;

  @Column({ type: 'varchar', length: 16, default: ProductType.MEMBERSHIP })
  type!: ProductType;

  /** 会员时长(天), MEMBERSHIP 类型使用 */
  @Column({ name: 'duration_days', type: 'int', default: 0 })
  durationDays!: number;

  /** 额度数量, QUOTA 类型使用 */
  @Column({ type: 'int', default: 0 })
  quota!: number;

  @Column({ length: 255, nullable: true })
  description?: string;
}
