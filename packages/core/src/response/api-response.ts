/**
 * 全局统一响应结构。所有接口返回都包装成这个形状，前端只需判断 code === 0。
 */
export interface ApiResponse<T = unknown> {
  /** 业务码，0 表示成功，非 0 表示业务错误 */
  code: number;
  /** 提示信息 */
  message: string;
  /** 业务数据 */
  data: T | null;
  /** 服务端时间戳(ms) */
  timestamp: number;
  /** 请求链路 ID，便于排查日志 */
  traceId?: string;
}

export function success<T>(data: T, message = 'success', traceId?: string): ApiResponse<T> {
  return { code: 0, message, data, timestamp: Date.now(), traceId };
}

export function failure(code: number, message: string, traceId?: string): ApiResponse<null> {
  return { code, message, data: null, timestamp: Date.now(), traceId };
}
