import { isAuthError, NestorApiError } from './errors.js'
import { MemoryTokenStore, type TokenStore } from './token-store.js'
import type {
  ApiResponse,
  Captcha,
  FileObject,
  IssuedTokens,
  ListQuery,
  LoginGate,
  LoginInput,
  PaginatedResult,
  Profile,
  RegisterInput,
} from './types.js'

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>

export interface NestorClientOptions {
  /** Backend origin, e.g. `http://localhost:3000`. */
  baseUrl: string
  /** Global route prefix the backend mounts under. Defaults to `api`. */
  prefix?: string
  /** Token persistence strategy. Defaults to an in-memory store. */
  tokenStore?: TokenStore
  /** Inject a `fetch` implementation (tests / non-global environments). */
  fetch?: FetchLike
  /** Called when refreshing fails and the session is cleared. */
  onUnauthorized?: () => void
}

interface RequestOptions {
  method?: string
  /** JSON-serialisable body. Ignored when `form` is provided. */
  body?: unknown
  /** multipart/form-data body (file uploads). */
  form?: FormData
  /** Query string parameters. */
  query?: Record<string, string | number | undefined>
  /** Attach the bearer token. Defaults to true. */
  auth?: boolean
  /** Internal: prevents infinite refresh recursion. */
  _retried?: boolean
}

/**
 * Typed client for the Nestor backend. Unwraps the unified `ApiResponse`
 * envelope (throwing `NestorApiError` on non-zero codes), attaches the bearer
 * token, and transparently refreshes an expired access token once per call.
 */
export class NestorClient {
  private readonly baseUrl: string
  private readonly prefix: string
  private readonly tokenStore: TokenStore
  private readonly fetchImpl: FetchLike
  private readonly onUnauthorized?: () => void
  /** De-dupes concurrent refreshes into a single in-flight request. */
  private refreshing: Promise<IssuedTokens> | null = null

  constructor(options: NestorClientOptions) {
    const fetchImpl =
      options.fetch ?? (typeof globalThis !== 'undefined' ? globalThis.fetch : undefined)
    if (!fetchImpl) {
      throw new Error('No fetch implementation available. Pass `fetch` in NestorClientOptions.')
    }
    this.baseUrl = options.baseUrl.replace(/\/+$/, '')
    this.prefix = (options.prefix ?? 'api').replace(/^\/+|\/+$/g, '')
    this.tokenStore = options.tokenStore ?? new MemoryTokenStore()
    this.fetchImpl = fetchImpl.bind(globalThis)
    this.onUnauthorized = options.onUnauthorized
  }

  /** Current token pair, if a session is active. */
  getTokens(): IssuedTokens | null {
    return this.tokenStore.get()
  }

  /** Replace (or clear) the stored token pair. */
  setTokens(tokens: IssuedTokens | null): void {
    this.tokenStore.set(tokens)
  }

  /** True when an access token is present. */
  isAuthenticated(): boolean {
    return Boolean(this.tokenStore.get()?.accessToken)
  }

  private buildUrl(path: string, query?: RequestOptions['query']): string {
    const base = `${this.baseUrl}/${this.prefix}${path.startsWith('/') ? path : `/${path}`}`
    if (!query) return base
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined) search.set(key, String(value))
    }
    const qs = search.toString()
    return qs ? `${base}?${qs}` : base
  }

  /** Absolute URL of a stored file's raw bytes (download / image src). */
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

    const res = await this.fetchImpl(this.buildUrl(path, query), { method, headers, body: payload })

    let envelope: ApiResponse<T> | null = null
    try {
      envelope = (await res.json()) as ApiResponse<T>
    } catch {
      envelope = null
    }

    // Transport-level auth failure (no/empty envelope): try a single refresh.
    if (!envelope) {
      if (res.ok) return undefined as T
      const transportErr = new NestorApiError(res.status, res.statusText || 'Request failed', {
        status: res.status,
      })
      if (auth && res.status === 401 && !options._retried && (await this.tryRefresh())) {
        return this.request<T>(path, { ...options, _retried: true })
      }
      throw transportErr
    }

    if (envelope.code !== 0) {
      const err = new NestorApiError(envelope.code, envelope.message, {
        traceId: envelope.traceId,
        status: res.status,
      })
      if (auth && !options._retried && isAuthError(err) && (await this.tryRefresh())) {
        return this.request<T>(path, { ...options, _retried: true })
      }
      throw err
    }

    return envelope.data as T
  }

  /** Refresh the access token. Returns false (and clears the session) on failure. */
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
    register: async (input: RegisterInput): Promise<IssuedTokens> => {
      const tokens = await this.request<IssuedTokens>('/auth/register', {
        method: 'POST',
        body: input,
        auth: false,
      })
      this.tokenStore.set(tokens)
      return tokens
    },
    login: async (input: LoginInput): Promise<IssuedTokens> => {
      const tokens = await this.request<IssuedTokens>('/auth/login', {
        method: 'POST',
        body: input,
        auth: false,
      })
      this.tokenStore.set(tokens)
      return tokens
    },
    loginGate: (identifier: string): Promise<LoginGate> =>
      this.request<LoginGate>('/auth/login/gate', { query: { identifier }, auth: false }),
    refresh: async (): Promise<IssuedTokens> => {
      const current = this.tokenStore.get()
      if (!current?.refreshToken) throw new NestorApiError(20003, 'No refresh token available')
      const tokens = await this.request<IssuedTokens>('/auth/refresh', {
        method: 'POST',
        body: { refreshToken: current.refreshToken },
        auth: false,
        _retried: true,
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

  readonly captcha = {
    generate: (): Promise<Captcha> => this.request<Captcha>('/auth/captcha', { auth: false }),
  }

  readonly files = {
    upload: (file: Blob, filename?: string): Promise<FileObject> => {
      const form = new FormData()
      form.append('file', file, filename)
      return this.request<FileObject>('/upload', { method: 'POST', form })
    },
    list: (query: ListQuery = {}): Promise<PaginatedResult<FileObject>> =>
      this.request<PaginatedResult<FileObject>>('/files', {
        query: { page: query.page, pageSize: query.pageSize },
      }),
    remove: (id: string): Promise<{ id: string }> =>
      this.request<{ id: string }>(`/files/${id}`, { method: 'DELETE' }),
    rawUrl: (id: string): string => this.fileRawUrl(id),
  }
}
