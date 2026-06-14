import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { Role } from './entities/role.entity';
import { User, UserStatus } from './entities/user.entity';

/** 需要初始化的权限编码与说明 */
const PERMISSIONS: Array<{ code: string; name: string; resource: string; action: string }> = [
  { code: 'user:read', name: '查看用户', resource: 'user', action: 'read' },
  { code: 'user:write', name: '管理用户', resource: 'user', action: 'write' },
  { code: 'product:read', name: '查看商品', resource: 'product', action: 'read' },
  { code: 'product:write', name: '管理商品', resource: 'product', action: 'write' },
  { code: 'card:read', name: '查看卡密', resource: 'card', action: 'read' },
  { code: 'card:create', name: '生成卡密', resource: 'card', action: 'create' },
  { code: 'card:redeem', name: '兑换卡密', resource: 'card', action: 'redeem' },
  { code: 'system:read', name: '查看系统日志/配置', resource: 'system', action: 'read' },
  { code: 'system:write', name: '管理系统配置', resource: 'system', action: 'write' },
  { code: 'workflow:read', name: '查看工作流/执行', resource: 'workflow', action: 'read' },
  { code: 'workflow:write', name: '管理/运行工作流', resource: 'workflow', action: 'write' },
  { code: 'file:read', name: '查看文件', resource: 'file', action: 'read' },
  { code: 'file:write', name: '管理文件', resource: 'file', action: 'write' },
  { code: 'notification:read', name: '查看通知渠道', resource: 'notification', action: 'read' },
  { code: 'notification:send', name: '发送通知', resource: 'notification', action: 'send' },
];

/** 普通用户默认拥有的权限 */
const USER_PERMISSIONS = ['card:redeem'];

/**
 * 启动时幂等地初始化基础 RBAC 数据: 权限、admin/user 角色、初始管理员账号。
 * 已存在则跳过, 不会重复创建。管理员账号可经 ADMIN_USERNAME/ADMIN_PASSWORD 配置。
 */
@Injectable()
export class SeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SeedService.name);

  constructor(
    @InjectRepository(Permission) private readonly permissions: Repository<Permission>,
    @InjectRepository(Role) private readonly roles: Repository<Role>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    const permissions = await this.seedPermissions();
    const adminRole = await this.seedRole('admin', '管理员', permissions);
    await this.seedRole(
      'user',
      '普通用户',
      permissions.filter((p) => USER_PERMISSIONS.includes(p.code)),
    );
    await this.seedAdminUser(adminRole);
  }

  private async seedPermissions(): Promise<Permission[]> {
    const result: Permission[] = [];
    for (const def of PERMISSIONS) {
      let perm = await this.permissions.findOne({ where: { code: def.code } });
      if (!perm) {
        perm = await this.permissions.save(this.permissions.create(def));
        this.logger.log(`创建权限 ${def.code}`);
      }
      result.push(perm);
    }
    return result;
  }

  private async seedRole(code: string, name: string, permissions: Permission[]): Promise<Role> {
    let role = await this.roles.findOne({ where: { code }, relations: { permissions: true } });
    if (!role) {
      role = await this.roles.save(this.roles.create({ code, name, permissions }));
      this.logger.log(`创建角色 ${code}`);
      return role;
    }
    // 角色已存在时补齐缺失权限 (幂等)
    const existing = new Set((role.permissions ?? []).map((p) => p.code));
    const merged = [...(role.permissions ?? [])];
    for (const p of permissions) {
      if (!existing.has(p.code)) merged.push(p);
    }
    if (merged.length !== (role.permissions ?? []).length) {
      role.permissions = merged;
      role = await this.roles.save(role);
    }
    return role;
  }

  private async seedAdminUser(adminRole: Role): Promise<void> {
    const username = process.env.ADMIN_USERNAME ?? 'admin';
    const existing = await this.users.findOne({ where: { username }, withDeleted: true });
    if (existing) {
      return;
    }
    const isProduction = (process.env.NODE_ENV ?? 'development') === 'production';
    const configuredPassword = process.env.ADMIN_PASSWORD;
    if (isProduction && !configuredPassword) {
      this.logger.warn(
        `生产环境未设置 ADMIN_PASSWORD, 已跳过创建初始管理员 "${username}" 以避免弱默认密码。` +
          ` 请设置 ADMIN_PASSWORD 后重启, 或手动创建管理员账号。`,
      );
      return;
    }
    const password = configuredPassword ?? 'admin123456';
    const passwordHash = await bcrypt.hash(password, 10);
    await this.users.save(
      this.users.create({
        username,
        nickname: '超级管理员',
        passwordHash,
        status: UserStatus.ACTIVE,
        roles: [adminRole],
      }),
    );
    this.logger.warn(
      `已创建初始管理员 "${username}" (默认密码 ${process.env.ADMIN_PASSWORD ? '来自环境变量' : 'admin123456, 请尽快修改'})`,
    );
  }
}
