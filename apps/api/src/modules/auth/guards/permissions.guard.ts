import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '@nestor/shared';
import { Request } from 'express';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { AuthUser } from '../auth.types';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';

/** 权限守卫: 调用者需拥有 @Permissions() 列出的全部权限编码。admin 角色放行。 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const user = context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    const roles = user?.roles ?? [];
    const perms = user?.permissions ?? [];
    if (roles.includes('admin') || required.every((p) => perms.includes(p))) {
      return true;
    }
    throw new BusinessException(ErrorCode.FORBIDDEN, '操作权限不足');
  }
}
