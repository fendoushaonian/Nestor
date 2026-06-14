import type { Execution, NodeTypeDef, Workflow, WorkflowGraph } from './types';

const TOKEN_KEY = 'nestor_token';

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const setToken = (t: string): void => localStorage.setItem(TOKEN_KEY, t);
export const clearToken = (): void => localStorage.removeItem(TOKEN_KEY);

interface ApiEnvelope<T> {
  code: number;
  message: string;
  data: T;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const body = (await res.json()) as ApiEnvelope<T>;
  if (!res.ok || body.code !== 0) {
    throw new Error(body.message || `请求失败 (${res.status})`);
  }
  return body.data;
}

interface Paginated<T> {
  list: T[];
  total: number;
}

export const api = {
  async login(identifier: string, password: string): Promise<string> {
    const data = await request<{ accessToken: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    });
    setToken(data.accessToken);
    return data.accessToken;
  },

  nodeTypes: () => request<NodeTypeDef[]>('/workflows/node-types'),

  listWorkflows: () => request<Paginated<Workflow>>('/workflows?pageSize=100').then((p) => p.list),

  getWorkflow: (id: string) => request<Workflow>(`/workflows/${id}`),

  createWorkflow: (name: string) =>
    request<Workflow>('/workflows', {
      method: 'POST',
      body: JSON.stringify({ name, graph: { nodes: [], connections: [] } }),
    }),

  saveWorkflow: (id: string, graph: WorkflowGraph, name: string) =>
    request<Workflow>(`/workflows/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ graph, name }),
    }),

  activate: (id: string, active: boolean) =>
    request<Workflow>(`/workflows/${id}/activate`, {
      method: 'POST',
      body: JSON.stringify({ active }),
    }),

  deleteWorkflow: (id: string) => request<unknown>(`/workflows/${id}`, { method: 'DELETE' }),

  run: (id: string, input: Record<string, unknown>) =>
    request<Execution>(`/workflows/${id}/run`, {
      method: 'POST',
      body: JSON.stringify({ input }),
    }),

  listExecutions: (workflowId: string) =>
    request<Paginated<Execution>>(`/workflows/${workflowId}/executions?pageSize=20`).then(
      (p) => p.list,
    ),

  getExecution: (id: string) => request<Execution>(`/executions/${id}`),
};
