import { DataItem } from './workflow.types';

export interface ExpressionScope {
  /** 当前 item 的 json */
  $json: Record<string, unknown>;
  /** 当前输入端口的所有 item */
  $items: DataItem[];
  /** 各节点的首条输出: $node['名称'].json */
  $node: Record<string, { json: Record<string, unknown> }>;
  /** 当前时间 (ms) */
  $now: number;
}

const EXPR_RE = /\{\{([\s\S]+?)\}\}/g;

/**
 * 在受限作用域里求值单个表达式。用 Function 而非 eval, 只暴露白名单变量。
 * 这是工作流引擎的预期能力 (类 n8n 的表达式), 非任意远程代码执行入口。
 */
function evalExpression(expr: string, scope: ExpressionScope): unknown {
  const fn = new Function('$json', '$items', '$node', '$now', `"use strict"; return (${expr});`);
  return fn(scope.$json, scope.$items, scope.$node, scope.$now);
}

/**
 * 解析含 {{ }} 的值:
 * - 整个字符串就是一个表达式时, 返回求值结果 (保留类型);
 * - 字符串里嵌了表达式时, 逐段替换并拼成字符串;
 * - 非字符串原样返回。
 */
export function resolveValue(value: unknown, scope: ExpressionScope): unknown {
  if (typeof value !== 'string') return value;

  const trimmed = value.trim();
  const single = trimmed.match(/^\{\{([\s\S]+)\}\}$/);
  if (single) {
    return evalExpression(single[1], scope);
  }
  if (!value.includes('{{')) return value;

  return value.replace(EXPR_RE, (_m, expr: string) => {
    const out = evalExpression(expr, scope);
    return out === undefined || out === null ? '' : String(out);
  });
}

/** 递归求值: 对对象/数组里的字符串叶子逐个解析表达式。 */
export function deepResolve(value: unknown, scope: ExpressionScope): unknown {
  if (typeof value === 'string') return resolveValue(value, scope);
  if (Array.isArray(value)) return value.map((v) => deepResolve(v, scope));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = deepResolve(v, scope);
    }
    return out;
  }
  return value;
}

export function buildScope(
  currentItem: DataItem | undefined,
  items: DataItem[],
  nodeOutputs: Record<string, DataItem[]>,
): ExpressionScope {
  const $node: ExpressionScope['$node'] = {};
  for (const [name, out] of Object.entries(nodeOutputs)) {
    $node[name] = { json: out[0]?.json ?? {} };
  }
  return {
    $json: currentItem?.json ?? {},
    $items: items,
    $node,
    $now: Date.now(),
  };
}
