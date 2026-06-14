import { describe, expect, it } from 'vitest';
import { buildScope, deepResolve, resolveValue } from '../src/modules/workflow/expression';

const scope = () =>
  buildScope({ json: { name: 'bob', age: 7 } }, [{ json: { name: 'bob', age: 7 } }], {
    Prev: [{ json: { ok: true } }],
  });

describe('expression', () => {
  it('整串单表达式保留类型', () => {
    expect(resolveValue('{{$json.age}}', scope())).toBe(7);
    expect(resolveValue('{{$json.age > 5}}', scope())).toBe(true);
  });

  it('内嵌表达式拼成字符串', () => {
    expect(resolveValue('hi {{$json.name}}!', scope())).toBe('hi bob!');
  });

  it('可读取其他节点输出 $node', () => {
    expect(resolveValue('{{$node["Prev"].json.ok}}', scope())).toBe(true);
  });

  it('无表达式原样返回', () => {
    expect(resolveValue('plain', scope())).toBe('plain');
    expect(resolveValue(42, scope())).toBe(42);
  });

  it('deepResolve 递归处理对象/数组', () => {
    const out = deepResolve(
      { a: '{{$json.name}}', b: ['{{$json.age}}', 'x'], c: 1 },
      scope(),
    ) as Record<string, unknown>;
    expect(out.a).toBe('bob');
    expect(out.b).toEqual([7, 'x']);
    expect(out.c).toBe(1);
  });
});
