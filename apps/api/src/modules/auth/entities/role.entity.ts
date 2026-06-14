import { BaseEntity } from '@nestor/core';
import { Column, Entity, Index, JoinTable, ManyToMany } from 'typeorm';
import { Permission } from './permission.entity';
import { User } from './user.entity';

@Entity('roles')
export class Role extends BaseEntity {
  @Column({ length: 64 })
  name!: string;

  /** 角色编码，如 admin / user，代码里用它判断 */
  @Index({ unique: true })
  @Column({ length: 64 })
  code!: string;

  @Column({ length: 255, nullable: true })
  description?: string;

  @ManyToMany(() => User, (user) => user.roles)
  users?: User[];

  @ManyToMany(() => Permission, (permission) => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'role_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions?: Permission[];
}
