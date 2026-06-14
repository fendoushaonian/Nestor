import { Injectable, Logger } from '@nestjs/common';
import { buildScope, deepResolve } from './expression';
import { NodeRegistry } from './nodes/node-registry';
import {
  DataItem,
  NodeExecuteContext,
  NodeOutputs,
  NodeRunResult,
  WorkflowGraph,
  WorkflowNode,
} from './workflow.types';

export interface RunOptions {
  /** 起始节点 id; 不传则自动找第一个触发节点 */
  startNodeId?: string;
  /** 起始节点的初始数据 */
  seed?: DataItem[];
  /** 按 credentialId 解密凭证 */
  resolveCredential?: (id: string) => Promise<Record<string, unknown> | undefined>;
}

export interface EngineResult {
  status: 'success' | 'error';
  nodeRuns: Record<string, NodeRunResult>;
  error?: string;
}

interface Incoming {
  fromId: string;
  fromPort: number;
  toPort: number;
}

@Injectable()
export class WorkflowEngine {
  private readonly logger = new Logger(WorkflowEngine.name);

  constructor(private readonly registry: NodeRegistry) {}

  async run(graph: WorkflowGraph, options: RunOptions = {}): Promise<EngineResult> {
    const nodes = graph.nodes ?? [];
    const connections = graph.connections ?? [];
    const byId = new Map(nodes.map((n) => [n.id, n]));

    const start = options.startNodeId
      ? byId.get(options.startNodeId)
      : nodes.find((n) => this.registry.isTrigger(n.type));
    if (!start) {
      return { status: 'error', nodeRuns: {}, error: '找不到起始/触发节点' };
    }

    const incoming = new Map<string, Incoming[]>();
    const outgoing = new Map<string, string[]>();
    for (const c of connections) {
      incoming.set(c.to, [
        ...(incoming.get(c.to) ?? []),
        { fromId: c.from, fromPort: c.fromPort ?? 0, toPort: c.toPort ?? 0 },
      ]);
      outgoing.set(c.from, [...(outgoing.get(c.from) ?? []), c.to]);
    }

    const order = this.topoOrder(start.id, outgoing, byId);
    if (!order) {
      return { status: 'error', nodeRuns: {}, error: '工作流存在环, 无法执行' };
    }

    const outputsById = new Map<string, NodeOutputs>();
    const outputsByName: Record<string, DataItem[]> = {};
    const nodeRuns: Record<string, NodeRunResult> = {};

    for (const nodeId of order) {
      const node = byId.get(nodeId)!;
      const inputsByPort = this.collectInputs(nodeId, incoming, outputsById);
      const input = inputsByPort[0] ?? [];

      const isStart = nodeId === start.id;
      const hasInput = inputsByPort.some((p) => p.length > 0);
      if (!isStart && !hasInput) {
        // 分支未命中的节点直接跳过, 输出空
        nodeRuns[node.name] = this.skipped();
        outputsById.set(nodeId, []);
        continue;
      }

      const seededInput = isStart ? (options.seed ?? [{ json: {} }]) : input;
      const result = await this.executeNode(
        node,
        seededInput,
        inputsByPort,
        outputsByName,
        options,
      );
      nodeRuns[node.name] = result.run;
      outputsById.set(nodeId, result.outputs);
      outputsByName[node.name] = result.outputs[0] ?? [];

      if (result.run.status === 'error' && !this.continueOnFail(node)) {
        return {
          status: 'error',
          nodeRuns,
          error: `节点 "${node.name}" 执行失败: ${result.run.error}`,
        };
      }
    }

    return { status: 'success', nodeRuns };
  }

  private async executeNode(
    node: WorkflowNode,
    input: DataItem[],
    inputsByPort: DataItem[][],
    outputsByName: Record<string, DataItem[]>,
    options: RunOptions,
  ): Promise<{ run: NodeRunResult; outputs: NodeOutputs }> {
    const def = this.registry.get(node.type);
    const startedAt = new Date();

    if (!def) {
      return {
        run: this.errorRun(input, startedAt, `未知节点类型: ${node.type}`),
        outputs: [],
      };
    }

    let credential: Record<string, unknown> | undefined;
    if (node.credentialId && options.resolveCredential) {
      credential = await options.resolveCredential(node.credentialId);
    }

    const ctx: NodeExecuteContext = {
      node,
      input,
      inputsByPort,
      credential,
      logger: this.logger,
      getRawParam: (name) => node.parameters?.[name],
      resolve: (value, itemIndex = 0) =>
        deepResolve(value, buildScope(input[itemIndex], input, outputsByName)),
      getParam: <T>(name: string, itemIndex = 0, fallback?: T) => {
        const raw = node.parameters?.[name];
        if (raw === undefined) return fallback as T;
        const resolved = deepResolve(raw, buildScope(input[itemIndex], input, outputsByName));
        return (resolved === undefined ? fallback : resolved) as T;
      },
      getNodeOutput: (name) => outputsByName[name] ?? [],
    };

    const retries = Math.max(0, Number(node.parameters?.retryOnFail ?? 0));
    const timeoutMs = Number(node.parameters?.timeoutMs ?? 0);

    let lastErr: unknown;
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const outputs = await this.withTimeout(Promise.resolve(def.execute(ctx)), timeoutMs);
        const finishedAt = new Date();
        return {
          run: {
            status: 'success',
            input,
            output: outputs,
            startedAt: startedAt.toISOString(),
            finishedAt: finishedAt.toISOString(),
            durationMs: finishedAt.getTime() - startedAt.getTime(),
          },
          outputs,
        };
      } catch (err) {
        lastErr = err;
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
        }
      }
    }

    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    const errorRun = this.errorRun(input, startedAt, msg);
    // continueOnFail: 输出错误 item, 让下游继续
    return {
      run: errorRun,
      outputs: this.continueOnFail(node) ? [[{ json: { error: msg } }]] : [],
    };
  }

  private collectInputs(
    nodeId: string,
    incoming: Map<string, Incoming[]>,
    outputsById: Map<string, NodeOutputs>,
  ): DataItem[][] {
    const ports: DataItem[][] = [];
    for (const conn of incoming.get(nodeId) ?? []) {
      const srcOut = outputsById.get(conn.fromId);
      const items = srcOut?.[conn.fromPort] ?? [];
      ports[conn.toPort] = [...(ports[conn.toPort] ?? []), ...items];
    }
    if (ports.length === 0) ports[0] = [];
    for (let i = 0; i < ports.length; i++) ports[i] = ports[i] ?? [];
    return ports;
  }

  /** 从 start 可达的子图做拓扑排序; 有环返回 null。 */
  private topoOrder(
    startId: string,
    outgoing: Map<string, string[]>,
    byId: Map<string, WorkflowNode>,
  ): string[] | null {
    const reachable = new Set<string>();
    const stack = [startId];
    while (stack.length) {
      const id = stack.pop()!;
      if (reachable.has(id) || !byId.has(id)) continue;
      reachable.add(id);
      for (const next of outgoing.get(id) ?? []) stack.push(next);
    }

    const indeg = new Map<string, number>();
    for (const id of reachable) indeg.set(id, 0);
    for (const id of reachable) {
      for (const next of outgoing.get(id) ?? []) {
        if (reachable.has(next)) indeg.set(next, (indeg.get(next) ?? 0) + 1);
      }
    }

    const queue = [...reachable].filter((id) => (indeg.get(id) ?? 0) === 0);
    const order: string[] = [];
    while (queue.length) {
      const id = queue.shift()!;
      order.push(id);
      for (const next of outgoing.get(id) ?? []) {
        if (!reachable.has(next)) continue;
        const d = (indeg.get(next) ?? 0) - 1;
        indeg.set(next, d);
        if (d === 0) queue.push(next);
      }
    }

    return order.length === reachable.size ? order : null;
  }

  private withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
    if (!ms || ms <= 0) return p;
    return Promise.race([
      p,
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error(`节点执行超时 (${ms}ms)`)), ms),
      ),
    ]);
  }

  private continueOnFail(node: WorkflowNode): boolean {
    return Boolean(node.parameters?.continueOnFail);
  }

  private skipped(): NodeRunResult {
    const now = new Date().toISOString();
    return {
      status: 'skipped',
      input: [],
      output: [],
      startedAt: now,
      finishedAt: now,
      durationMs: 0,
    };
  }

  private errorRun(input: DataItem[], startedAt: Date, error: string): NodeRunResult {
    const finishedAt = new Date();
    return {
      status: 'error',
      input,
      output: [],
      error,
      startedAt: startedAt.toISOString(),
      finishedAt: finishedAt.toISOString(),
      durationMs: finishedAt.getTime() - startedAt.getTime(),
    };
  }
}
