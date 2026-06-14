import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCode } from '@nestor/shared';
import type { Request } from 'express';
import { BusinessException } from '../../../common/exceptions/business.exception';
import { AuthUser } from '../auth.types';
import { ROLES_KEY } from '../decorators/roles.decorator';

/** 角色守卫: 调用者需拥有 @Roles() 列出的任意一个角色。 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) {
      return true;
    }
    const user = context.switchToHttp().getRequest<Request & { user?: AuthUser }>().user;
    const roles = user?.roles ?? [];
    if (roles.includes('admin') || required.some((r) => roles.includes(r))) {
      return true;
    }
    throw new BusinessException(ErrorCode.FORBIDDEN, '角色权限不足');
  }
}
