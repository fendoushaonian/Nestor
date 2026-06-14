import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ErrorCode, failure } from '@nestor/core';
import { Request, Response } from 'express';

/**
 * 全局异常兜底。把任何抛出的错误转成统一响应结构，避免泄露堆栈给前端。
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();
    const traceId = request?.id;

    let httpStatus = HttpStatus.INTERNAL_SERVER_ERROR;
    let code: number = ErrorCode.UNKNOWN;
    let message = 'Internal server error';

    if (exception instanceof HttpException) {
      httpStatus = exception.getStatus();
      const res = exception.getResponse();
      message = this.extractMessage(res, exception.message);
      code = this.mapHttpStatusToCode(httpStatus);
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    if (httpStatus >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `[${traceId ?? '-'}] ${request?.method} ${request?.url} -> ${message}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    response.status(httpStatus).json(failure(code, message, traceId));
  }

  private extractMessage(res: string | object, fallback: string): string {
    if (typeof res === 'string') return res;
    const maybe = res as { message?: string | string[] };
    if (Array.isArray(maybe.message)) return maybe.message.join('; ');
    if (typeof maybe.message === 'string') return maybe.message;
    return fallback;
  }

  private mapHttpStatusToCode(status: number): number {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return ErrorCode.VALIDATION_FAILED;
      case HttpStatus.UNAUTHORIZED:
        return ErrorCode.UNAUTHORIZED;
      case HttpStatus.FORBIDDEN:
        return ErrorCode.FORBIDDEN;
      case HttpStatus.NOT_FOUND:
        return ErrorCode.NOT_FOUND;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCode.RATE_LIMITED;
      default:
        return ErrorCode.UNKNOWN;
    }
  }
}
