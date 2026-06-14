import { DataItem, NodeDefinition } from '../workflow.types';

/** Set: 为每条 item 设置/覆盖字段, 值支持 {{ }} 表达式。 */
export const setNode: NodeDefinition = {
  type: 'set',
  displayName: '设置字段',
  group: 'action',
  description: '为每条数据设置/覆盖字段 (值可用表达式)',
  properties: [
    {
      name: 'fields',
      displayName: '字段 (JSON: key -> 值/表达式)',
      type: 'json',
      default: {},
    },
    {
      name: 'keepOnlySet',
      displayName: '只保留设置的字段',
      type: 'boolean',
      default: false,
      expression: false,
    },
  ],
  execute: (ctx) => {
    const keepOnly = Boolean(ctx.getRawParam('keepOnlySet'));
    const out: DataItem[] = ctx.input.map((item, i) => {
      const fieldsRaw = (ctx.getRawParam('fields') as Record<string, unknown>) ?? {};
      const resolved: Record<string, unknown> = {};
      for (const [key, val] of Object.entries(fieldsRaw)) {
        resolved[key] = ctx.resolve(val, i);
      }
      return { json: keepOnly ? resolved : { ...item.json, ...resolved } };
    });
    return [out];
  },
};

/** Merge: 把多个输入端口的 item 合并到一个输出。 */
export const mergeNode: NodeDefinition = {
  type: 'merge',
  displayName: '合并',
  group: 'logic',
  description: '将多个输入分支的数据合并为一路',
  execute: (ctx) => {
    const merged: DataItem[] = ([] as DataItem[]).concat(...ctx.inputsByPort);
    return [merged];
  },
};

/** NoOp: 原样透传, 常用于占位/汇合。 */
export const noOpNode: NodeDefinition = {
  type: 'noOp',
  displayName: '空操作',
  group: 'logic',
  description: '原样透传数据',
  execute: (ctx) => [ctx.input],
};

/** Wait: 延迟指定毫秒后透传 (上限 60s, 防止卡死)。 */
export const waitNode: NodeDefinition = {
  type: 'wait',
  displayName: '等待',
  group: 'logic',
  description: '延迟一段时间后继续',
  properties: [
    { name: 'ms', displayName: '毫秒', type: 'number', default: 1000, expression: false },
  ],
  execute: async (ctx) => {
    const ms = Math.min(Math.max(Number(ctx.getRawParam('ms') ?? 0), 0), 60_000);
    if (ms > 0) await new Promise((r) => setTimeout(r, ms));
    return [ctx.input];
  },
};

/**
 * Code: 运行用户 JS。脚本可访问 `items` (输入) 与 `$json` (首条), 需 return 一个数组。
 * 这是工作流引擎的预期能力 (类 n8n 的 Code 节点)。
 */
export const codeNode: NodeDefinition = {
  type: 'code',
  displayName: '代码',
  group: 'action',
  description: '运行自定义 JS, return 一个数组作为输出',
  properties: [
    {
      name: 'jsCode',
      displayName: 'JavaScript',
      type: 'code',
      default: 'return items;',
      expression: false,
    },
  ],
  execute: (ctx) => {
    const code = String(ctx.getRawParam('jsCode') ?? 'return items;');
    const items = ctx.input;
    const fn = new Function('items', '$json', `"use strict";\n${code}`);
    const result = fn(items, items[0]?.json ?? {}) as unknown;
    const arr = Array.isArray(result) ? result : [result];
    const out: DataItem[] = arr.map((r) =>
      r && typeof r === 'object' && 'json' in (r as object)
        ? (r as DataItem)
        : { json: (r ?? {}) as Record<string, unknown> },
    );
    return [out];
  },
};
