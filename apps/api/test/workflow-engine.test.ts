import { describe, expect, it } from 'vitest';
import { WorkflowEngine } from '../src/modules/workflow/engine.service';
import { NodeRegistry } from '../src/modules/workflow/nodes/node-registry';
import { DataItem, WorkflowGraph } from '../src/modules/workflow/workflow.types';

const engine = () => new WorkflowEngine(new NodeRegistry());

const seed = (json: Record<string, unknown>): DataItem[] => [{ json }];

describe('WorkflowEngine', () => {
  it('线性执行: Manual -> Set, 表达式取上游数据', async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: 't', name: 'Start', type: 'manualTrigger', parameters: {} },
        {
          id: 's',
          name: 'Set',
          type: 'set',
          parameters: { fields: { greeting: 'hi {{$json.name}}' } },
        },
      ],
      connections: [{ from: 't', to: 's' }],
    };
    const res = await engine().run(graph, { seed: seed({ name: 'bob' }) });
    expect(res.status).toBe('success');
    expect(res.nodeRuns['Set'].output[0][0].json.greeting).toBe('hi bob');
  });

  it('IF 分流: 命中分支执行, 未命中分支跳过', async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: 't', name: 'Start', type: 'manualTrigger', parameters: {} },
        {
          id: 'if',
          name: 'Check',
          type: 'if',
          parameters: { value1: '{{$json.n}}', operator: 'gt', value2: '5' },
        },
        { id: 'a', name: 'WhenTrue', type: 'noOp', parameters: {} },
        { id: 'b', name: 'WhenFalse', type: 'noOp', parameters: {} },
      ],
      connections: [
        { from: 't', to: 'if' },
        { from: 'if', to: 'a', fromPort: 0 },
        { from: 'if', to: 'b', fromPort: 1 },
      ],
    };
    const res = await engine().run(graph, { seed: seed({ n: 10 }) });
    expect(res.status).toBe('success');
    expect(res.nodeRuns['WhenTrue'].status).toBe('success');
    expect(res.nodeRuns['WhenTrue'].output[0]).toHaveLength(1);
    expect(res.nodeRuns['WhenFalse'].status).toBe('skipped');
  });

  it('Switch 多路: 按取值匹配规则, 未命中走兜底端口', async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: 't', name: 'Start', type: 'manualTrigger', parameters: {} },
        {
          id: 'sw',
          name: 'Route',
          type: 'switch',
          parameters: { value: '{{$json.kind}}', rules: [{ equals: 'a' }, { equals: 'b' }] },
        },
      ],
      connections: [{ from: 't', to: 'sw' }],
    };
    const res = await engine().run(graph, { seed: seed({ kind: 'b' }) });
    const out = res.nodeRuns['Route'].output;
    expect(out[0]).toHaveLength(0); // 规则 a
    expect(out[1]).toHaveLength(1); // 规则 b 命中
    expect(out[2]).toHaveLength(0); // 兜底
  });

  it('Merge 合并多个输入端口', async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: 't', name: 'Start', type: 'manualTrigger', parameters: {} },
        { id: 'a', name: 'A', type: 'set', parameters: { fields: { tag: 'a' } } },
        { id: 'b', name: 'B', type: 'set', parameters: { fields: { tag: 'b' } } },
        { id: 'm', name: 'Merged', type: 'merge', parameters: {} },
      ],
      connections: [
        { from: 't', to: 'a' },
        { from: 't', to: 'b' },
        { from: 'a', to: 'm', toPort: 0 },
        { from: 'b', to: 'm', toPort: 1 },
      ],
    };
    const res = await engine().run(graph, { seed: seed({}) });
    expect(res.nodeRuns['Merged'].output[0]).toHaveLength(2);
  });

  it('Code 节点运行用户脚本', async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: 't', name: 'Start', type: 'manualTrigger', parameters: {} },
        {
          id: 'c',
          name: 'Code',
          type: 'code',
          parameters: { jsCode: 'return items.map(i => ({ json: { doubled: i.json.x * 2 } }));' },
        },
      ],
      connections: [{ from: 't', to: 'c' }],
    };
    const res = await engine().run(graph, { seed: seed({ x: 21 }) });
    expect(res.nodeRuns['Code'].output[0][0].json.doubled).toBe(42);
  });

  it('continueOnFail: 节点报错但流程继续', async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: 't', name: 'Start', type: 'manualTrigger', parameters: {} },
        {
          id: 'c',
          name: 'Boom',
          type: 'code',
          parameters: { jsCode: 'throw new Error("boom");', continueOnFail: true },
        },
        { id: 'n', name: 'After', type: 'noOp', parameters: {} },
      ],
      connections: [
        { from: 't', to: 'c' },
        { from: 'c', to: 'n' },
      ],
    };
    const res = await engine().run(graph, { seed: seed({}) });
    expect(res.status).toBe('success');
    expect(res.nodeRuns['Boom'].status).toBe('error');
    expect(res.nodeRuns['After'].status).toBe('success');
  });

  it('无 continueOnFail 时整个执行失败', async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: 't', name: 'Start', type: 'manualTrigger', parameters: {} },
        { id: 'c', name: 'Boom', type: 'code', parameters: { jsCode: 'throw new Error("boom");' } },
      ],
      connections: [{ from: 't', to: 'c' }],
    };
    const res = await engine().run(graph, { seed: seed({}) });
    expect(res.status).toBe('error');
    expect(res.error).toContain('Boom');
  });

  it('检测到环时报错', async () => {
    const graph: WorkflowGraph = {
      nodes: [
        { id: 't', name: 'Start', type: 'manualTrigger', parameters: {} },
        { id: 'a', name: 'A', type: 'noOp', parameters: {} },
        { id: 'b', name: 'B', type: 'noOp', parameters: {} },
      ],
      connections: [
        { from: 't', to: 'a' },
        { from: 'a', to: 'b' },
        { from: 'b', to: 'a' },
      ],
    };
    const res = await engine().run(graph, { seed: seed({}) });
    expect(res.status).toBe('error');
    expect(res.error).toContain('环');
  });

  it('找不到触发节点时报错', async () => {
    const graph: WorkflowGraph = {
      nodes: [{ id: 'n', name: 'N', type: 'noOp', parameters: {} }],
      connections: [],
    };
    const res = await engine().run(graph);
    expect(res.status).toBe('error');
  });
});
