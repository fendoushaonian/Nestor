import type { IssuedTokens } from './types.js'

/** Persists the access/refresh token pair between requests. */
export interface TokenStore {
  get(): IssuedTokens | null
  set(tokens: IssuedTokens | null): void
}

/** Default in-memory store (per-client lifetime; suitable for SSR/tests). */
export class MemoryTokenStore implements TokenStore {
  private tokens: IssuedTokens | null = null

  get(): IssuedTokens | null {
    return this.tokens
  }

  set(tokens: IssuedTokens | null): void {
    this.tokens = tokens
  }
}

/**
 * Browser store backed by `localStorage`, so a session survives page reloads.
 * Falls back to memory when `localStorage` is unavailable (SSR/Node).
 */
export function createLocalStorageTokenStore(key = 'nestor.tokens'): TokenStore {
  const ls: Storage | undefined =
    typeof globalThis !== 'undefined' ? (globalThis as { localStorage?: Storage }).localStorage : undefined
  if (!ls) return new MemoryTokenStore()

  return {
    get(): IssuedTokens | null {
      const raw = ls.getItem(key)
      if (!raw) return null
      try {
        return JSON.parse(raw) as IssuedTokens
      } catch {
        return null
      }
    },
    set(tokens: IssuedTokens | null): void {
      if (tokens) ls.setItem(key, JSON.stringify(tokens))
      else ls.removeItem(key)
    },
  }
}
