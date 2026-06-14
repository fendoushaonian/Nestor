import { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  addEdge,
  Background,
  Controls,
  type Connection,
  type Edge,
  type Node,
  useEdgesState,
  useNodesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { api, clearToken, getToken } from './api';
import type { Execution, GraphNode, NodeTypeDef, Workflow, WorkflowGraph } from './types';
import { WfNode, type WfNodeData } from './WfNode';

const rfNodeTypes = { wf: WfNode };

const TRIGGERS = new Set(['manualTrigger', 'webhook', 'schedule']);

interface NodeMeta {
  name: string;
  type: string;
  parameters: Record<string, unknown>;
  credentialId?: string;
}

function Login({ onDone }: { onDone: () => void }) {
  const [id, setId] = useState('admin');
  const [pw, setPw] = useState('admin123456');
  const [err, setErr] = useState('');
  const submit = async () => {
    try {
      await api.login(id, pw);
      onDone();
    } catch (e) {
      setErr((e as Error).message);
    }
  };
  return (
    <div className="login">
      <h2>Nestor 工作流</h2>
      <label>账号</label>
      <input value={id} onChange={(e) => setId(e.target.value)} />
      <label>密码</label>
      <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} />
      <div style={{ marginTop: 16 }}>
        <button className="primary" onClick={submit}>
          登录
        </button>
      </div>
      {err && <div className="err">{err}</div>}
    </div>
  );
}

export function App() {
  const [authed, setAuthed] = useState(!!getToken());
  const [catalog, setCatalog] = useState<NodeTypeDef[]>([]);
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [current, setCurrent] = useState<Workflow | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<WfNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [meta, setMeta] = useState<Record<string, NodeMeta>>({});
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const [runInput, setRunInput] = useState('{}');
  const [execution, setExecution] = useState<Execution | null>(null);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [error, setError] = useState('');

  const defByType = useMemo(() => {
    const m: Record<string, NodeTypeDef> = {};
    for (const d of catalog) m[d.type] = d;
    return m;
  }, [catalog]);

  const loadWorkflows = useCallback(async () => {
    setWorkflows(await api.listWorkflows());
  }, []);

  useEffect(() => {
    if (!authed) return;
    api
      .nodeTypes()
      .then(setCatalog)
      .catch((e) => setError((e as Error).message));
    loadWorkflows().catch((e) => setError((e as Error).message));
  }, [authed, loadWorkflows]);

  const graphToFlow = useCallback(
    (wf: Workflow) => {
      const g = wf.graph ?? { nodes: [], connections: [] };
      const m: Record<string, NodeMeta> = {};
      const rfNodes: Node<WfNodeData>[] = g.nodes.map((n, i) => {
        const def = defByType[n.type];
        m[n.id] = {
          name: n.name,
          type: n.type,
          parameters: n.parameters ?? {},
          credentialId: n.credentialId,
        };
        return {
          id: n.id,
          type: 'wf',
          position: n.position ?? { x: 120 + (i % 4) * 220, y: 80 + Math.floor(i / 4) * 140 },
          data: {
            label: n.name,
            type: n.type,
            group: def?.group ?? 'action',
            isTrigger: TRIGGERS.has(n.type),
            outputs: def?.outputs ?? 1,
            outputNames: def?.outputNames,
          },
        };
      });
      const rfEdges: Edge[] = g.connections.map((c) => ({
        id: `${c.from}:${c.fromPort ?? 0}-${c.to}:${c.toPort ?? 0}`,
        source: c.from,
        target: c.to,
        sourceHandle: `out-${c.fromPort ?? 0}`,
        targetHandle: `in-${c.toPort ?? 0}`,
      }));
      setMeta(m);
      setNodes(rfNodes);
      setEdges(rfEdges);
      setSelectedNode(null);
      setExecution(null);
    },
    [defByType, setNodes, setEdges],
  );

  const openWorkflow = useCallback(
    async (id: string) => {
      const wf = await api.getWorkflow(id);
      setCurrent(wf);
      graphToFlow(wf);
      setExecutions(await api.listExecutions(id));
    },
    [graphToFlow],
  );

  const onConnect = useCallback(
    (c: Connection) => setEdges((eds) => addEdge({ ...c }, eds)),
    [setEdges],
  );

  const addNode = (def: NodeTypeDef) => {
    const id = `n${Date.now().toString(36)}`;
    const params: Record<string, unknown> = {};
    for (const p of def.properties ?? []) {
      if (p.default !== undefined) params[p.name] = p.default;
    }
    setMeta((m) => ({
      ...m,
      [id]: { name: def.displayName ?? def.type, type: def.type, parameters: params },
    }));
    setNodes((ns) => [
      ...ns,
      {
        id,
        type: 'wf',
        position: { x: 200 + Math.random() * 200, y: 120 + Math.random() * 160 },
        data: {
          label: def.displayName ?? def.type,
          type: def.type,
          group: def.group,
          isTrigger: TRIGGERS.has(def.type),
          outputs: def.outputs ?? 1,
          outputNames: def.outputNames,
        },
      },
    ]);
  };

  const buildGraph = useCallback((): WorkflowGraph => {
    const gNodes: GraphNode[] = nodes.map((n) => {
      const mm = meta[n.id];
      return {
        id: n.id,
        name: mm?.name ?? n.id,
        type: mm?.type ?? n.data.type,
        parameters: mm?.parameters ?? {},
        credentialId: mm?.credentialId || undefined,
        position: n.position,
      };
    });
    const conns = edges.map((e) => ({
      from: e.source,
      to: e.target,
      fromPort: Number((e.sourceHandle ?? 'out-0').replace('out-', '')) || 0,
      toPort: Number((e.targetHandle ?? 'in-0').replace('in-', '')) || 0,
    }));
    return { nodes: gNodes, connections: conns };
  }, [nodes, edges, meta]);

  const save = async () => {
    if (!current) return;
    try {
      const wf = await api.saveWorkflow(current.id, buildGraph(), current.name);
      setCurrent(wf);
      await loadWorkflows();
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const applyRunStatus = useCallback(
    (exec: Execution | null) => {
      setNodes((ns) =>
        ns.map((n) => {
          const name = meta[n.id]?.name ?? '';
          const run = exec?.nodeRuns?.[name];
          return { ...n, data: { ...n.data, runStatus: run?.status } };
        }),
      );
    },
    [meta, setNodes],
  );

  const run = async () => {
    if (!current) return;
    try {
      await save();
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(runInput || '{}');
      } catch {
        setError('运行输入不是合法 JSON');
        return;
      }
      const exec = await api.run(current.id, input);
      setExecution(exec);
      applyRunStatus(exec);
      setExecutions(await api.listExecutions(current.id));
      setError('');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggleActive = async () => {
    if (!current) return;
    const wf = await api.activate(current.id, !current.active);
    setCurrent(wf);
    await loadWorkflows();
  };

  const removeWorkflow = async () => {
    if (!current) return;
    if (!confirm(`删除工作流 "${current.name}"?`)) return;
    await api.deleteWorkflow(current.id);
    setCurrent(null);
    setNodes([]);
    setEdges([]);
    await loadWorkflows();
  };

  const createWorkflow = async () => {
    const name = prompt('新工作流名称', '未命名工作流');
    if (!name) return;
    const wf = await api.createWorkflow(name);
    await loadWorkflows();
    await openWorkflow(wf.id);
  };

  const loadExecution = async (id: string) => {
    const exec = await api.getExecution(id);
    setExecution(exec);
    applyRunStatus(exec);
  };

  const updateMeta = (patch: Partial<NodeMeta>) => {
    if (!selectedNode) return;
    setMeta((m) => ({ ...m, [selectedNode]: { ...m[selectedNode], ...patch } }));
    if (patch.name !== undefined) {
      setNodes((ns) =>
        ns.map((n) =>
          n.id === selectedNode ? { ...n, data: { ...n.data, label: patch.name as string } } : n,
        ),
      );
    }
  };

  if (!authed) return <Login onDone={() => setAuthed(true)} />;

  const sel = selectedNode ? meta[selectedNode] : null;
  const selDef = sel ? defByType[sel.type] : null;
  const selRun = sel && execution ? execution.nodeRuns?.[sel.name] : undefined;

  const grouped: Record<string, NodeTypeDef[]> = { trigger: [], logic: [], action: [] };
  for (const d of catalog) (grouped[d.group] ?? grouped.action).push(d);

  return (
    <div className="app">
      <div className="sidebar">
        <h3>工作流</h3>
        <div style={{ padding: 8 }}>
          <button className="primary" style={{ width: '100%' }} onClick={createWorkflow}>
            + 新建
          </button>
        </div>
        {workflows.map((w) => (
          <div
            key={w.id}
            className={`wf-item ${current?.id === w.id ? 'active' : ''}`}
            onClick={() => openWorkflow(w.id)}
          >
            {w.name} {w.active && <span className="badge on">运行中</span>}
            <div className="meta">{new Date(w.updatedAt).toLocaleString()}</div>
          </div>
        ))}

        <h3>节点</h3>
        <div className="palette">
          {(['trigger', 'logic', 'action'] as const).map((g) => (
            <div key={g}>
              <div className="grp">{g}</div>
              {grouped[g].map((d) => (
                <button key={d.type} disabled={!current} onClick={() => addNode(d)}>
                  {d.displayName ?? d.type}
                </button>
              ))}
            </div>
          ))}
        </div>
        <div style={{ marginTop: 'auto', padding: 8 }}>
          <button
            style={{ width: '100%' }}
            onClick={() => {
              clearToken();
              setAuthed(false);
            }}
          >
            退出登录
          </button>
        </div>
      </div>

      <div className="main">
        <div className="toolbar">
          <span className="title">{current ? current.name : '请选择或新建工作流'}</span>
          {current && (
            <>
              {error && <span className="err">{error}</span>}
              <input
                style={{ width: 180 }}
                value={runInput}
                onChange={(e) => setRunInput(e.target.value)}
                placeholder='运行输入 JSON, 如 {"x":1}'
              />
              <button onClick={toggleActive}>{current.active ? '停用' : '启用'}</button>
              <button onClick={save}>保存</button>
              <button className="primary" onClick={run}>
                运行
              </button>
              <button className="danger" onClick={removeWorkflow}>
                删除
              </button>
            </>
          )}
        </div>

        <div className="canvas-wrap">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            nodeTypes={rfNodeTypes}
            onNodeClick={(_, n) => setSelectedNode(n.id)}
            onPaneClick={() => setSelectedNode(null)}
            fitView
          >
            <Background />
            <Controls />
          </ReactFlow>

          {(execution || executions.length > 0) && (
            <div className="panel">
              <div style={{ display: 'flex', gap: 12, alignItems: 'baseline' }}>
                <strong>运行</strong>
                {execution && (
                  <span className={`badge ${execution.status === 'success' ? 'on' : ''}`}>
                    {execution.status} · {execution.mode}
                  </span>
                )}
                <span style={{ marginLeft: 'auto', color: '#9ca3af' }}>历史:</span>
                {executions.slice(0, 8).map((e) => (
                  <button key={e.id} onClick={() => loadExecution(e.id)}>
                    {e.status[0].toUpperCase()} {new Date(e.createdAt).toLocaleTimeString()}
                  </button>
                ))}
              </div>
              {execution?.error && <div className="err">{execution.error}</div>}
              {sel && selRun && (
                <div>
                  <div style={{ margin: '8px 0' }}>
                    节点 <b>{sel.name}</b> · {selRun.status} · {selRun.durationMs}ms
                  </div>
                  <pre>{JSON.stringify(selRun.output, null, 2)}</pre>
                </div>
              )}
              {!sel && <div style={{ color: '#9ca3af' }}>点击某个节点查看它的输出数据</div>}
            </div>
          )}
        </div>
      </div>

      {sel && (
        <div className="inspector">
          <h3 style={{ padding: 0, border: 0 }}>节点设置</h3>
          <label>名称</label>
          <input value={sel.name} onChange={(e) => updateMeta({ name: e.target.value })} />
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>类型: {sel.type}</div>

          {(selDef?.properties ?? []).map((p) => {
            const val = sel.parameters[p.name];
            const setVal = (v: unknown) =>
              updateMeta({ parameters: { ...sel.parameters, [p.name]: v } });
            return (
              <div key={p.name}>
                <label>
                  {p.displayName ?? p.name}
                  {p.required ? ' *' : ''}
                </label>
                {p.type === 'options' ? (
                  <select value={String(val ?? '')} onChange={(e) => setVal(e.target.value)}>
                    {(p.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : p.type === 'boolean' ? (
                  <input
                    type="checkbox"
                    style={{ width: 'auto' }}
                    checked={!!val}
                    onChange={(e) => setVal(e.target.checked)}
                  />
                ) : p.type === 'json' ? (
                  <textarea
                    rows={4}
                    defaultValue={JSON.stringify(val ?? {}, null, 2)}
                    onBlur={(e) => {
                      try {
                        setVal(JSON.parse(e.target.value || '{}'));
                      } catch {
                        setError(`${p.name} 不是合法 JSON`);
                      }
                    }}
                  />
                ) : (
                  <input value={String(val ?? '')} onChange={(e) => setVal(e.target.value)} />
                )}
              </div>
            );
          })}

          <label>凭证 ID (可选)</label>
          <input
            value={sel.credentialId ?? ''}
            onChange={(e) => updateMeta({ credentialId: e.target.value })}
            placeholder="httpRequest 节点用"
          />
        </div>
      )}
    </div>
  );
}
