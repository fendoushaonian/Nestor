// @vitest-environment jsdom
import { act, render, renderHook, screen, waitFor } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NestorClient } from '../src/client.js';
import {
  NestorProvider,
  useAuth,
  useNestorClient,
  useNestorMutation,
  useNestorQuery,
} from '../src/react.js';

/** Build a client whose fetch is driven by a per-path response map. */
function makeClient(routes: Record<string, unknown>) {
  const fetchImpl = vi.fn(async (input: string) => {
    const path = new URL(input).pathname.replace(/^\/api/, '');
    const body = routes[path];
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      json: async () => ({ code: 0, message: 'success', data: body, timestamp: 0 }),
    } as Response;
  });
  return new NestorClient({ baseUrl: 'http://localhost:3000', fetch: fetchImpl });
}

const wrapper =
  (client: NestorClient) =>
  ({ children }: { children: ReactNode }) =>
    createElement(NestorProvider, { client }, children);

afterEach(() => vi.restoreAllMocks());

describe('useNestorClient', () => {
  it('throws when no provider is mounted', () => {
    expect(() => renderHook(() => useNestorClient())).toThrow(/NestorProvider/);
  });

  it('returns the client from context', () => {
    const client = makeClient({});
    const { result } = renderHook(() => useNestorClient(), { wrapper: wrapper(client) });
    expect(result.current).toBe(client);
  });
});

describe('useNestorQuery', () => {
  it('loads data then exposes it; refetch re-runs', async () => {
    const client = makeClient({
      '/files': { list: [{ id: 'f1' }], total: 1, page: 1, pageSize: 20, totalPages: 1 },
    });
    const spy = vi.spyOn(client.files, 'list');
    const { result } = renderHook(() => useNestorQuery((c) => c.files.list()), {
      wrapper: wrapper(client),
    });

    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error).toBeUndefined();
    expect(result.current.data?.list).toEqual([{ id: 'f1' }]);

    await act(async () => {
      await result.current.refetch();
    });
    expect(spy).toHaveBeenCalledTimes(2);
  });

  it('captures errors from the fetcher', async () => {
    const client = makeClient({});
    vi.spyOn(client.files, 'list').mockRejectedValue(new Error('boom'));
    const { result } = renderHook(() => useNestorQuery((c) => c.files.list()), {
      wrapper: wrapper(client),
    });
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.error?.message).toBe('boom');
  });
});

describe('useNestorMutation', () => {
  it('runs the mutator and stores the result', async () => {
    const client = makeClient({});
    const { result } = renderHook(
      () => useNestorMutation((_c, n: number) => Promise.resolve(n * 2)),
      { wrapper: wrapper(client) },
    );

    let returned: number | undefined;
    await act(async () => {
      returned = await result.current.mutate(21);
    });
    expect(returned).toBe(42);
    expect(result.current.data).toBe(42);
    expect(result.current.loading).toBe(false);

    act(() => result.current.reset());
    expect(result.current.data).toBeUndefined();
  });

  it('surfaces and rethrows mutator errors', async () => {
    const client = makeClient({});
    const { result } = renderHook(
      () => useNestorMutation(() => Promise.reject(new Error('fail'))),
      { wrapper: wrapper(client) },
    );
    await act(async () => {
      await expect(result.current.mutate()).rejects.toThrow('fail');
    });
    expect(result.current.error?.message).toBe('fail');
  });
});

describe('useAuth', () => {
  const tokens = { accessToken: 'a', refreshToken: 'r', tokenType: 'Bearer' };

  it('starts unauthenticated and loads profile after login', async () => {
    const client = makeClient({
      '/auth/login': tokens,
      '/auth/profile': { id: 'u1', username: 'admin', roles: ['admin'], permissions: ['*'] },
    });
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);

    await act(async () => {
      await result.current.login({ identifier: 'admin', password: 'x' });
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.profile?.username).toBe('admin');
  });

  it('clears state on logout', async () => {
    const client = makeClient({
      '/auth/profile': { id: 'u1', username: 'admin', roles: [], permissions: [] },
      '/auth/logout': null,
    });
    client.setTokens(tokens);
    const { result } = renderHook(() => useAuth(), { wrapper: wrapper(client) });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(true));
    await act(async () => {
      await result.current.logout();
    });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.profile).toBeUndefined();
  });
});

describe('NestorProvider', () => {
  it('renders children', () => {
    const client = makeClient({});
    render(createElement(NestorProvider, { client }, createElement('span', null, 'hi')));
    expect(screen.getByText('hi')).toBeTruthy();
  });
});
