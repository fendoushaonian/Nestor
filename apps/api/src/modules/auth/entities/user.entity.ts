import { BaseEntity } from '@nestor/shared';
import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { Role } from './role.entity';

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  LOCKED = 'locked',
}

@Entity('users')
export class User extends BaseEntity {
  @Index({ unique: true })
  @Column({ length: 64 })
  username!: string;

  @Index({ unique: true })
  @Column({ length: 128, nullable: true })
  email?: string;

  @Index({ unique: true })
  @Column({ length: 32, nullable: true })
  phone?: string;

  /** bcrypt/argon2 哈希后的密码，绝不存明文 (P2 写入) */
  @Column({ name: 'password_hash', length: 255, select: false })
  passwordHash!: string;

  @Column({ length: 64, nullable: true })
  nickname?: string;

  @Column({ name: 'avatar_url', length: 512, nullable: true })
  avatarUrl?: string;

  @Column({ type: 'varchar', length: 16, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @ManyToMany(() => Role, (role) => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'role_id', referencedColumnName: 'id' },
  })
  roles?: Role[];
}
