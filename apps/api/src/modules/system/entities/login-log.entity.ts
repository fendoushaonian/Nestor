import { BaseEntity } from '@nestor/shared';
import { Column, Entity, Index } from 'typeorm';

/** 登录日志: 记录每次登录尝试, 用于安全审计与失败锁定。 */
@Entity('login_logs')
export class LoginLog extends BaseEntity {
  @Index()
  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId?: string;

  @Column({ length: 64, nullable: true })
  username?: string;

  @Column({ length: 64, nullable: true })
  ip?: string;

  @Column({ name: 'user_agent', length: 512, nullable: true })
  userAgent?: string;

  @Column({ default: false })
  success!: boolean;

  @Column({ length: 255, nullable: true })
  message?: string;
}
