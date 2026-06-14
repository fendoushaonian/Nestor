/**
 * Nestor frontend client — vendored, dependency-free copy of `@nestor/sdk`.
 *
 * It is bundled into the template so a freshly scaffolded app runs with nothing
 * but Vite installed. Once `@nestor/sdk` is published, you can delete this file
 * and `import { NestorClient } from '@nestor/sdk'` instead — the API is identical.
 */

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T | null
  timestamp: number
  traceId?: string
}

export interface PaginatedResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

export interface IssuedTokens {
  accessToken: string
  refreshToken: string
  tokenType: string
}

export interface Profile {
  id: string
  username: string
  roles: string[]
  permissions: string[]
}

export interface FileObject {
  id: string
  key: string
  driver: string
  originalName: string
  mimeType: string
  size: number
  url: string
  uploaderId?: string
  createdAt: string
  updatedAt: string
}

export interface LoginInput {
  identifier: string
  password: string
  captchaId?: string
  captchaText?: string
}

const AUTH_CODES = new Set([20000, 20002, 20003])

export class NestorApiError extends Error {
  readonly code: number
  readonly traceId?: string
  readonly status?: number
  constructor(code: number, message: string, opts: { traceId?: string; status?: number } = {}) {
    super(message)
    this.name = 'NestorApiError'
    this.code = code
    this.traceId = opts.traceId
    this.status = opts.status
  }
}

export interface TokenStore {
  get(): IssuedTokens | null
  set(tokens: IssuedTokens | null): void
}

export function createLocalStorageTokenStore(key = 'nestor.tokens'): TokenStore {
  return {
    get(): IssuedTokens | null {
      const raw = localStorage.getItem(key)
      if (!raw) return null
      try {
        return JSON.parse(raw) as IssuedTokens
      } catch {
        return null
      }
    },
    set(tokens: IssuedTokens | null): void {
      if (tokens) localStorage.setItem(key, JSON.stringify(tokens))
      else localStorage.removeItem(key)
    },
  }
}

export interface NestorClientOptions {
  baseUrl: string
  prefix?: string
  tokenStore?: TokenStore
  onUnauthorized?: () => void
}

interface RequestOptions {
  method?: string
  body?: unknown
  form?: FormData
  query?: Record<string, string | number | undefined>
  auth?: boolean
  _retried?: boolean
}

export class NestorClient {
  private readonly baseUrl: string
  private readonly prefix: string
  private readonly tokenStore: TokenStore
  private readonly onUnauthorized?: () => void
  private refreshing: Promise<IssuedTokens> | null = null

  constructor(options: NestorClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.prefix = (options.prefix ?? 'api').replace(/^\/+|\/+$/g, '')
    this.tokenStore = options.tokenStore ?? createLocalStorageTokenStore()
    this.onUnauthorized = options.onUnauthorized
  }

  getTokens(): IssuedTokens | null {
    return this.tokenStore.get()
  }
  setTokens(tokens: IssuedTokens | null): void {
    this.tokenStore.set(tokens)
  }
  isAuthenticated(): boolean {
    return Boolean(this.tokenStore.get()?.accessToken)
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const base = `${this.baseUrl}/${this.prefix}${path.startsWith('/') ? path : `/${path}`}`
    if (!query) return base
    const search = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) if (v !== undefined) search.set(k, String(v))
    const qs = search.toString()
    return qs ? `${base}?${qs}` : base
  }

  fileRawUrl(id: string): string {
    return this.buildUrl(`/files/${id}/raw`)
  }

  private async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, form, query, auth = true } = options
    const headers: Record<string, string> = {}
    if (auth) {
      const token = this.tokenStore.get()?.accessToken
      if (token) headers['Authorization'] = `Bearer ${token}`
    }
    let payload: BodyInit | undefined
    if (form) {
      payload = form
    } else if (body !== undefined) {
      headers['Content-Type'] = 'application/json'
      payload = JSON.stringify(body)
    }

    const res = await fetch(this.buildUrl(path, query), { method, headers, body: payload })
    let envelope: ApiResponse<T> | null = null
    try {
      envelope = (await res.json()) as ApiResponse<T>
    } catch {
      envelope = null
    }

    if (!envelope) {
      if (res.ok) return undefined as T
      if (auth && res.status === 401 && !options._retried && (await this.tryRefresh())) {
        return this.request<T>(path, { ...options, _retried: true })
      }
      throw new NestorApiError(res.status, res.statusText || 'Request failed', { status: res.status })
    }

    if (envelope.code !== 0) {
      const err = new NestorApiError(envelope.code, envelope.message, {
        traceId: envelope.traceId,
        status: res.status,
      })
      const isAuth = res.status === 401 || AUTH_CODES.has(envelope.code)
      if (auth && !options._retried && isAuth && (await this.tryRefresh())) {
        return this.request<T>(path, { ...options, _retried: true })
      }
      throw err
    }
    return envelope.data as T
  }

  private async tryRefresh(): Promise<boolean> {
    const current = this.tokenStore.get()
    if (!current?.refreshToken) return false
    try {
      if (!this.refreshing) {
        this.refreshing = this.request<IssuedTokens>('/auth/refresh', {
          method: 'POST',
          body: { refreshToken: current.refreshToken },
          auth: false,
          _retried: true,
        })
      }
      const tokens = await this.refreshing
      this.tokenStore.set(tokens)
      return true
    } catch {
      this.tokenStore.set(null)
      this.onUnauthorized?.()
      return false
    } finally {
      this.refreshing = null
    }
  }

  readonly auth = {
    login: async (input: LoginInput): Promise<IssuedTokens> => {
      const tokens = await this.request<IssuedTokens>('/auth/login', {
        method: 'POST',
        body: input,
        auth: false,
      })
      this.tokenStore.set(tokens)
      return tokens
    },
    logout: async (): Promise<void> => {
      try {
        await this.request<void>('/auth/logout', { method: 'POST' })
      } finally {
        this.tokenStore.set(null)
      }
    },
    profile: (): Promise<Profile> => this.request<Profile>('/auth/profile'),
  }

  readonly files = {
    upload: (file: Blob, filename?: string): Promise<FileObject> => {
      const form = new FormData()
      form.append('file', file, filename)
      return this.request<FileObject>('/upload', { method: 'POST', form })
    },
    list: (query: { page?: number; pageSize?: number } = {}): Promise<PaginatedResult<FileObject>> =>
      this.request<PaginatedResult<FileObject>>('/files', {
        query: { page: query.page, pageSize: query.pageSize },
      }),
    rawUrl: (id: string): string => this.fileRawUrl(id),
  }
}
