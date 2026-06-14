import { BaseEntity } from '@nestor/core';
import { Column, Entity, Index } from 'typeorm';

/** 操作审计日志: 记录谁在何时对什么资源做了什么动作。 */
@Entity('audit_logs')
export class AuditLog extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ length: 128 })
  action!: string;

  @Column({ length: 128, nullable: true })
  target?: string;

  @Column({ type: 'text', nullable: true })
  detail?: string;

  @Column({ length: 64, nullable: true })
  ip?: string;

  @Column({ name: 'user_agent', length: 512, nullable: true })
  userAgent?: string;
}
