import { describe, it, expect, vi } from 'vitest'
import { MemoryTokenStore, NestorApiError, NestorClient } from '../src/index.js'
import type { ApiResponse } from '../src/index.js'

/** Build a Response-like object exposing only what the client touches. */
function jsonResponse<T>(body: ApiResponse<T>, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: 'OK',
    json: async () => body,
  } as unknown as Response
}

function ok<T>(data: T): ApiResponse<T> {
  return { code: 0, message: 'success', data, timestamp: Date.now() }
}

function fail(code: number, message = 'error'): ApiResponse<null> {
  return { code, message, data: null, timestamp: Date.now() }
}

const TOKENS = { accessToken: 'a1', refreshToken: 'r1', tokenType: 'Bearer' }

describe('NestorClient', () => {
  it('builds prefixed URLs and unwraps the ApiResponse envelope', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(ok({ id: '1', username: 'alice', roles: [], permissions: [] })))
    const client = new NestorClient({ baseUrl: 'http://localhost:3000/', fetch: fetchMock })
    client.setTokens(TOKENS)

    const profile = await client.auth.profile()

    expect(profile.username).toBe('alice')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://localhost:3000/api/auth/profile')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer a1')
  })

  it('stores tokens after login', async () => {
    const store = new MemoryTokenStore()
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(ok(TOKENS)))
    const client = new NestorClient({ baseUrl: 'http://localhost:3000', fetch: fetchMock, tokenStore: store })

    await client.auth.login({ identifier: 'alice', password: 'pw' })

    expect(store.get()).toEqual(TOKENS)
    expect(client.isAuthenticated()).toBe(true)
  })

  it('throws NestorApiError carrying code/traceId on business failure', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(jsonResponse({ code: 40001, message: 'bad', data: null, timestamp: 0, traceId: 't-9' }))
    const client = new NestorClient({ baseUrl: 'http://x', fetch: fetchMock })

    await expect(client.auth.loginGate('alice')).rejects.toMatchObject({
      name: 'NestorApiError',
      code: 40001,
      traceId: 't-9',
    })
  })

  it('auto-refreshes once on an expired access token, then retries', async () => {
    const fetchMock = vi
      .fn()
      // 1) profile -> token expired
      .mockResolvedValueOnce(jsonResponse(fail(20002, 'token expired')))
      // 2) refresh -> new tokens
      .mockResolvedValueOnce(jsonResponse(ok({ accessToken: 'a2', refreshToken: 'r2', tokenType: 'Bearer' })))
      // 3) retried profile -> success with the refreshed token
      .mockResolvedValueOnce(jsonResponse(ok({ id: '1', username: 'bob', roles: [], permissions: [] })))
    const store = new MemoryTokenStore()
    store.set(TOKENS)
    const client = new NestorClient({ baseUrl: 'http://x', fetch: fetchMock, tokenStore: store })

    const profile = await client.auth.profile()

    expect(profile.username).toBe('bob')
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(store.get()?.accessToken).toBe('a2')
    // The retry must carry the refreshed bearer token.
    const retryInit = fetchMock.mock.calls[2][1]
    expect((retryInit.headers as Record<string, string>).Authorization).toBe('Bearer a2')
  })

  it('clears the session and surfaces the error when refresh fails', async () => {
    const onUnauthorized = vi.fn()
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(fail(20002, 'token expired')))
      .mockResolvedValueOnce(jsonResponse(fail(20003, 'refresh invalid')))
    const store = new MemoryTokenStore()
    store.set(TOKENS)
    const client = new NestorClient({ baseUrl: 'http://x', fetch: fetchMock, tokenStore: store, onUnauthorized })

    await expect(client.auth.profile()).rejects.toBeInstanceOf(NestorApiError)
    expect(store.get()).toBeNull()
    expect(onUnauthorized).toHaveBeenCalledOnce()
  })

  it('uploads a file as multipart/form-data under the `file` field', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(ok({ id: 'f1', originalName: 'a.txt' })))
    const client = new NestorClient({ baseUrl: 'http://x', fetch: fetchMock })
    client.setTokens(TOKENS)

    await client.files.upload(new Blob(['hello'], { type: 'text/plain' }), 'a.txt')

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('http://x/api/upload')
    expect(init.method).toBe('POST')
    expect(init.body).toBeInstanceOf(FormData)
    expect((init.body as FormData).get('file')).toBeInstanceOf(Blob)
  })

  it('exposes absolute raw file URLs and serialises list query params', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(ok({ list: [], total: 0, page: 2, pageSize: 5, totalPages: 0 })))
    const client = new NestorClient({ baseUrl: 'http://x', fetch: fetchMock })
    client.setTokens(TOKENS)

    expect(client.files.rawUrl('f1')).toBe('http://x/api/files/f1/raw')

    await client.files.list({ page: 2, pageSize: 5 })
    expect(fetchMock.mock.calls[0][0]).toBe('http://x/api/files?page=2&pageSize=5')
  })
})
