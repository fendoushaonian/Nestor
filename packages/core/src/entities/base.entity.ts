import {
  CreateDateColumn,
  DeleteDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

/**
 * 所有业务实体的基类: UUID 主键 + 创建/更新/软删除时间。
 * UUID 主键跨 sqlite/mysql/postgres 行为一致, 且利于分布式与防枚举。
 * 软删除靠 deletedAt，配合 TypeORM 的 softRemove，不物理删数据，方便审计与恢复。
 */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
