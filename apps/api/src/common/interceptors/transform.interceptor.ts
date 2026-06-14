import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { ApiResponse, success } from '@nestor/core';
import { Request } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/**
 * 把所有 controller 的返回值统一包装成 { code, message, data, ... }。
 * 这样前端不用关心每个接口的形状，只看 code 是否为 0。
 */
@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    const req = context.switchToHttp().getRequest<Request & { id?: string }>();
    const traceId = req?.id;
    return next.handle().pipe(map((data) => success(data as T, 'success', traceId)));
  }
}
