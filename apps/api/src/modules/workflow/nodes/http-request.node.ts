import { DataItem, NodeDefinition } from '../workflow.types';

interface HttpCredential {
  // httpHeaderAuth
  headerName?: string;
  headerValue?: string;
  // httpBasicAuth
  username?: string;
  password?: string;
  // httpQueryAuth
  queryName?: string;
  queryValue?: string;
}

/** 给请求应用凭证 (按凭证类型注入 header / basic / query)。 */
function applyCredential(
  url: string,
  headers: Record<string, string>,
  cred: HttpCredential | undefined,
): string {
  if (!cred) return url;
  if (cred.headerName && cred.headerValue) {
    headers[cred.headerName] = cred.headerValue;
  }
  if (cred.username !== undefined && cred.password !== undefined) {
    const token = Buffer.from(`${cred.username}:${cred.password}`).toString('base64');
    headers['Authorization'] = `Basic ${token}`;
  }
  if (cred.queryName && cred.queryValue) {
    const u = new URL(url);
    u.searchParams.set(cred.queryName, cred.queryValue);
    return u.toString();
  }
  return url;
}

export const httpRequestNode: NodeDefinition = {
  type: 'httpRequest',
  displayName: 'HTTP 请求',
  group: 'action',
  description: '发起 HTTP 请求, 支持表达式与凭证鉴权',
  properties: [
    {
      name: 'method',
      displayName: '方法',
      type: 'options',
      default: 'GET',
      options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map((m) => ({ label: m, value: m })),
    },
    { name: 'url', displayName: 'URL', type: 'string', required: true },
    { name: 'headers', displayName: '请求头 (JSON)', type: 'json', default: {} },
    { name: 'body', displayName: '请求体 (JSON)', type: 'json', default: {} },
  ],
  execute: async (ctx) => {
    const out: DataItem[] = [];
    const cred = ctx.credential as HttpCredential | undefined;

    for (let i = 0; i < ctx.input.length; i++) {
      const method = String(ctx.getParam('method', i, 'GET')).toUpperCase();
      let url = String(ctx.getParam('url', i, ''));
      const headers: Record<string, string> = {
        ...(ctx.getParam<Record<string, string>>('headers', i, {}) ?? {}),
      };
      const body = ctx.getParam<Record<string, unknown>>('body', i, undefined);

      url = applyCredential(url, headers, cred);

      const init: RequestInit = { method, headers };
      if (method !== 'GET' && method !== 'HEAD' && body && Object.keys(body).length > 0) {
        headers['Content-Type'] = headers['Content-Type'] ?? 'application/json';
        init.body = JSON.stringify(body);
      }

      const res = await fetch(url, init);
      const text = await res.text();
      let parsed: unknown = text;
      try {
        parsed = text ? JSON.parse(text) : null;
      } catch {
        parsed = text;
      }

      out.push({
        json: {
          statusCode: res.status,
          headers: Object.fromEntries(res.headers.entries()),
          body: parsed,
        },
      });
    }

    return [out];
  },
};
