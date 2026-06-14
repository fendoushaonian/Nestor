/** Backend business error codes the SDK reacts to (subset of @nestor/shared ErrorCode). */
export const ErrorCode = {
  UNAUTHORIZED: 20000,
  TOKEN_EXPIRED: 20002,
  TOKEN_INVALID: 20003,
} as const

/** Thrown when the backend returns a non-zero business `code`. */
export class NestorApiError extends Error {
  readonly code: number
  readonly traceId?: string
  /** HTTP status, when the failure originated from the transport layer. */
  readonly status?: number

  constructor(code: number, message: string, options: { traceId?: string; status?: number } = {}) {
    super(message)
    this.name = 'NestorApiError'
    this.code = code
    this.traceId = options.traceId
    this.status = options.status
  }
}

/** True when the error indicates the access token is missing/expired/invalid. */
export function isAuthError(err: unknown): boolean {
  if (!(err instanceof NestorApiError)) return false
  return (
    err.status === 401 ||
    err.code === ErrorCode.UNAUTHORIZED ||
    err.code === ErrorCode.TOKEN_EXPIRED ||
    err.code === ErrorCode.TOKEN_INVALID
  )
}
