import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode } from '@nestor/shared';

/**
 * 业务异常: 携带业务错误码 (ErrorCode), 由全局异常过滤器转成统一响应。
 * 用于表达「请求合法但业务上不允许」的场景, 如卡密已使用、凭证错误等。
 */
export class BusinessException extends HttpException {
  constructor(
    readonly code: ErrorCode,
    message: string,
    httpStatus: HttpStatus = HttpStatus.BAD_REQUEST,
  ) {
    super(message, httpStatus);
  }
}
