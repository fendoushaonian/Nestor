export interface NodePropertyDef {
  name: string;
  displayName?: string;
  type?: string;
  default?: unknown;
  required?: boolean;
  options?: Array<{ label: string; value: string }>;
}

export interface NodeTypeDef {
  type: string;
  displayName?: string;
  group: 'trigger' | 'action' | 'logic';
  description?: string;
  outputs?: number;
  outputNames?: string[];
  properties?: NodePropertyDef[];
}

export interface GraphNode {
  id: string;
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  credentialId?: string;
  position?: { x: number; y: number };
}

export interface GraphConnection {
  from: string;
  to: string;
  fromPort?: number;
  toPort?: number;
}

export interface WorkflowGraph {
  nodes: GraphNode[];
  connections: GraphConnection[];
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  active: boolean;
  graph?: WorkflowGraph;
  updatedAt: string;
}

export interface NodeRunResult {
  status: 'success' | 'error' | 'skipped';
  input: Array<Array<{ json: Record<string, unknown> }>> | Array<{ json: Record<string, unknown> }>;
  output: Array<Array<{ json: Record<string, unknown> }>>;
  error?: string;
  durationMs?: number;
}

export interface Execution {
  id: string;
  workflowId: string;
  status: string;
  mode: string;
  error?: string;
  nodeRuns?: Record<string, NodeRunResult>;
  createdAt: string;
}
