import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** 要求调用者拥有其中任意一个角色编码。配合 RolesGuard 使用。 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
