import { Logger } from '@nestjs/common';

/** 工作流中流动的一条数据 */
export interface DataItem {
  json: Record<string, unknown>;
}

/** 节点的输出: 每个输出端口一组 item (如 IF 节点有 true/false 两个端口) */
export type NodeOutputs = DataItem[][];

export interface WorkflowNode {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  credentialId?: string;
  position?: { x: number; y: number };
}

export interface WorkflowConnection {
  /** 源节点 id */
  from: string;
  /** 目标节点 id */
  to: string;
  /** 源输出端口序号, 默认 0 */
  fromPort?: number;
  /** 目标输入端口序号, 默认 0 */
  toPort?: number;
}

export interface WorkflowGraph {
  nodes: WorkflowNode[];
  connections: WorkflowConnection[];
}

export type NodeRunStatus = 'success' | 'error' | 'skipped';

/** 单个节点的运行结果快照, 存进 Execution.nodeRuns */
export interface NodeRunResult {
  status: NodeRunStatus;
  /** 输入 item (端口 0) */
  input: DataItem[];
  /** 输出 (每端口一组) */
  output: NodeOutputs;
  error?: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
}

export interface NodeGroup {
  TRIGGER: 'trigger';
  ACTION: 'action';
  LOGIC: 'logic';
}

/** 节点参数的 UI 描述 (驱动前端表单) */
export interface NodePropertyDef {
  name: string;
  displayName: string;
  type: 'string' | 'number' | 'boolean' | 'json' | 'options' | 'code';
  default?: unknown;
  required?: boolean;
  description?: string;
  options?: Array<{ label: string; value: string | number }>;
  /** 是否支持 {{ }} 表达式 (默认 true) */
  expression?: boolean;
}

/** 节点执行时拿到的上下文 */
export interface NodeExecuteContext {
  node: WorkflowNode;
  /** 输入 item (端口 0, 已合并各上游) */
  input: DataItem[];
  /** 按输入端口分组的 item */
  inputsByPort: DataItem[][];
  /** 取参数并对 {{ }} 求值 (itemIndex 指定用第几条 item 作为表达式上下文) */
  getParam<T = unknown>(name: string, itemIndex?: number, fallback?: T): T;
  /** 取原始参数 (不求值) */
  getRawParam(name: string): unknown;
  /** 对任意值/字符串求值表达式 */
  resolve(value: unknown, itemIndex?: number): unknown;
  /** 取某节点的输出 (端口 0) */
  getNodeOutput(nodeName: string): DataItem[];
  /** 解密后的凭证数据 (节点声明了 credentialId 时注入) */
  credential?: Record<string, unknown>;
  logger: Logger;
}

/** 一个节点类型的定义 (注册到 NodeRegistry) */
export interface NodeDefinition {
  type: string;
  displayName: string;
  group: 'trigger' | 'action' | 'logic';
  description?: string;
  /** 输出端口数, 默认 1 */
  outputs?: number;
  /** 输出端口名 (前端展示, 如 IF 的 ['true','false']) */
  outputNames?: string[];
  /** 节点参数定义 (前端表单) */
  properties?: NodePropertyDef[];
  execute(ctx: NodeExecuteContext): Promise<NodeOutputs> | NodeOutputs;
}
