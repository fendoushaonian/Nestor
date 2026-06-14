import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ApiResponse, success } from '@nestor/shared';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_TRANSFORM } from '../decorators/skip-transform.decorator';

/**
 * 把所有 controller 的返回值统一包装成 { code, message, data, ... }。
 * 这样前端不用关心每个接口的形状，只看 code 是否为 0。
 * 标注了 @SkipTransform() 的路由会保留原始返回 (如健康检查)。
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T> | T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T> | T> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_TRANSFORM, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return next.handle();
    }
    const req = context.switchToHttp().getRequest<Request & { id?: string }>();
    const traceId = req?.id;
    return next.handle().pipe(map((data) => success(data as T, 'success', traceId)));
  }
}
