import { BaseEntity } from '@nestor/core';
import { Column, Entity, Index } from 'typeorm';

/** 系统配置: 键值对形式的可在线调整参数。 */
@Entity('configs')
export class Config extends BaseEntity {
  @Index({ unique: true })
  @Column({ name: 'config_key', length: 128 })
  key!: string;

  @Column({ name: 'config_value', type: 'text', nullable: true })
  value?: string;

  @Column({ name: 'config_group', length: 64, nullable: true })
  group?: string;

  @Column({ length: 255, nullable: true })
  description?: string;
}
