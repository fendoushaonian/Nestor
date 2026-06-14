import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type DependencyList,
  type ReactNode,
} from 'react';
import { NestorClient } from './client.js';
import { isAuthError } from './errors.js';
import type { LoginInput, Profile, RegisterInput } from './types.js';

const NestorContext = createContext<NestorClient | null>(null);

export interface NestorProviderProps {
  /** A configured `NestorClient` instance shared with the component tree. */
  client: NestorClient;
  children: ReactNode;
}

/** Makes a `NestorClient` available to the hooks below via React context. */
export function NestorProvider({ client, children }: NestorProviderProps) {
  return createElement(NestorContext.Provider, { value: client }, children);
}

/** Returns the `NestorClient` from context. Throws if no provider is mounted. */
export function useNestorClient(): NestorClient {
  const client = useContext(NestorContext);
  if (!client) {
    throw new Error('useNestorClient must be used within a <NestorProvider>.');
  }
  return client;
}

export interface QueryState<T> {
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  /** Re-run the query imperatively (ignores the deps array). */
  refetch: () => Promise<void>;
}

/**
 * Declarative data fetching against the backend. Re-runs whenever `deps` change,
 * tracks loading/error, and ignores results from stale runs (avoids races when
 * deps change quickly). Pass `deps` like you would to `useEffect`.
 */
export function useNestorQuery<T>(
  fetcher: (client: NestorClient) => Promise<T>,
  deps: DependencyList = [],
): QueryState<T> {
  const client = useNestorClient();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  // Bumped on every run so late-resolving stale runs can be discarded.
  const runId = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const run = useCallback(async () => {
    const id = ++runId.current;
    setLoading(true);
    setError(undefined);
    try {
      const result = await fetcherRef.current(client);
      if (id === runId.current) setData(result);
    } catch (err) {
      if (id === runId.current) setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      if (id === runId.current) setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void run();
  }, deps);

  return { data, error, loading, refetch: run };
}

export interface MutationState<TArgs, T> {
  mutate: (args: TArgs) => Promise<T>;
  data: T | undefined;
  error: Error | undefined;
  loading: boolean;
  /** Clear data/error/loading back to the initial state. */
  reset: () => void;
}

/**
 * Imperative mutations (login, upload, create…). `mutate` returns the result so
 * callers can await it, while `data`/`error`/`loading` drive UI state.
 */
export function useNestorMutation<TArgs = void, T = unknown>(
  mutator: (client: NestorClient, args: TArgs) => Promise<T>,
): MutationState<TArgs, T> {
  const client = useNestorClient();
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const mutatorRef = useRef(mutator);
  mutatorRef.current = mutator;

  const mutate = useCallback(
    async (args: TArgs): Promise<T> => {
      setLoading(true);
      setError(undefined);
      try {
        const result = await mutatorRef.current(client, args);
        setData(result);
        return result;
      } catch (err) {
        const e = err instanceof Error ? err : new Error(String(err));
        setError(e);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  const reset = useCallback(() => {
    setData(undefined);
    setError(undefined);
    setLoading(false);
  }, []);

  return { mutate, data, error, loading, reset };
}

export interface AuthState {
  isAuthenticated: boolean;
  profile: Profile | undefined;
  loading: boolean;
  error: Error | undefined;
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  /** Reload the current profile from the backend. */
  refresh: () => Promise<void>;
}

/**
 * Auth session state bound to the client's token store. Loads the profile on
 * mount when a session exists, and keeps `isAuthenticated`/`profile` in sync
 * across login/register/logout.
 */
export function useAuth(): AuthState {
  const client = useNestorClient();
  const [profile, setProfile] = useState<Profile | undefined>(undefined);
  const [isAuthenticated, setAuthed] = useState(() => client.isAuthenticated());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const loadProfile = useCallback(async () => {
    if (!client.isAuthenticated()) {
      setProfile(undefined);
      setAuthed(false);
      return;
    }
    setLoading(true);
    setError(undefined);
    try {
      const p = await client.auth.profile();
      setProfile(p);
      setAuthed(true);
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      // An auth failure means the session is no longer valid.
      if (isAuthError(e)) {
        setProfile(undefined);
        setAuthed(false);
      }
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const login = useCallback(
    async (input: LoginInput) => {
      await client.auth.login(input);
      await loadProfile();
    },
    [client, loadProfile],
  );

  const register = useCallback(
    async (input: RegisterInput) => {
      await client.auth.register(input);
      await loadProfile();
    },
    [client, loadProfile],
  );

  const logout = useCallback(async () => {
    await client.auth.logout();
    setProfile(undefined);
    setAuthed(false);
  }, [client]);

  return {
    isAuthenticated,
    profile,
    loading,
    error,
    login,
    register,
    logout,
    refresh: loadProfile,
  };
}
