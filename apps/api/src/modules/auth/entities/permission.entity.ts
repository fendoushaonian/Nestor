import { BaseEntity } from '@nestor/shared';
import { Column, Entity, Index, ManyToMany } from 'typeorm';
import { Role } from './role.entity';

@Entity('permissions')
export class Permission extends BaseEntity {
  @Column({ length: 64 })
  name!: string;

  /** 权限编码，如 card:create / user:read，配合 @Permissions 守卫使用 */
  @Index({ unique: true })
  @Column({ length: 128 })
  code!: string;

  /** 资源，如 card / user */
  @Column({ length: 64, nullable: true })
  resource?: string;

  /** 动作，如 create / read / update / delete */
  @Column({ length: 32, nullable: true })
  action?: string;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles?: Role[];
}
