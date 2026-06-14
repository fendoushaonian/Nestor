import { BaseEntity } from '@nestor/shared';
import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { User } from './user.entity';

/**
 * 第三方登录身份绑定:把一个外部账号(provider + providerUserId)关联到本地 User。
 * 一个用户可绑定多个 provider;(provider, providerUserId) 全局唯一。
 */
@Entity('user_identities')
@Index('uq_identity_provider_user', ['provider', 'providerUserId'], { unique: true })
export class UserIdentity extends BaseEntity {
  @Index()
  @Column({ name: 'user_id' })
  userId!: string;

  /** 提供方: google | github | wechat | apple */
  @Column({ length: 32 })
  provider!: string;

  /** 提供方内的用户唯一标识(Google sub / GitHub id / 微信 unionid|openid / Apple sub) */
  @Column({ name: 'provider_user_id', length: 191 })
  providerUserId!: string;

  /** 微信 unionId 等跨应用统一标识(可选) */
  @Column({ name: 'union_id', length: 191, nullable: true })
  unionId?: string;

  /** 原始返回资料(脱敏排查用) */
  @Column({ name: 'raw', type: 'simple-json', nullable: true })
  raw?: Record<string, unknown>;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user?: User;
}
