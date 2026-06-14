/**
 * Wire types mirroring the Nestor backend (apps/api) contract. Declared locally
 * so the frontend SDK stays dependency-free (the backend's `@nestor/shared`
 * pulls in TypeORM and is unsuitable for the browser).
 */

/** Unified envelope returned by every backend endpoint. `code === 0` means success. */
export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T | null;
  timestamp: number;
  traceId?: string;
}

/** Paginated list payload. */
export interface PaginatedResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/** Token pair issued by register/login/refresh. */
export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
}

/** Authenticated user profile (GET /auth/profile). */
export interface Profile {
  id: string;
  username: string;
  roles: string[];
  permissions: string[];
}

/** Pre-login gate hints (GET /auth/login/gate). */
export interface LoginGate {
  captchaRequired: boolean;
  locked: boolean;
}

/** Captcha challenge (GET /auth/captcha). */
export interface Captcha {
  captchaId: string;
  /** Inline SVG markup; can be rendered directly or wrapped in a data URI. */
  svg: string;
}

/** Stored file metadata (POST /upload, GET /files). */
export interface FileObject {
  id: string;
  key: string;
  driver: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploaderId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LoginInput {
  identifier: string;
  password: string;
  captchaId?: string;
  captchaText?: string;
}

export interface RegisterInput {
  username: string;
  password: string;
  [extra: string]: unknown;
}

export interface ListQuery {
  page?: number;
  pageSize?: number;
}
