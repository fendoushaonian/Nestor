import { DataItem, NodeDefinition } from '../workflow.types';

type Operator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'isEmpty'
  | 'isNotEmpty'
  | 'isTrue';

function compare(a: unknown, op: Operator, b: unknown): boolean {
  switch (op) {
    case 'equals':
      return String(a) === String(b);
    case 'notEquals':
      return String(a) !== String(b);
    case 'contains':
      return String(a).includes(String(b));
    case 'gt':
      return Number(a) > Number(b);
    case 'gte':
      return Number(a) >= Number(b);
    case 'lt':
      return Number(a) < Number(b);
    case 'lte':
      return Number(a) <= Number(b);
    case 'isEmpty':
      return a === undefined || a === null || a === '';
    case 'isNotEmpty':
      return !(a === undefined || a === null || a === '');
    case 'isTrue':
      return a === true || a === 'true' || a === 1 || a === '1';
    default:
      return false;
  }
}

/** IF: 按条件把每条 item 分到 true(端口0) / false(端口1)。 */
export const ifNode: NodeDefinition = {
  type: 'if',
  displayName: 'IF 条件',
  group: 'logic',
  description: '按条件将数据分流到 true / false 两个分支',
  outputs: 2,
  outputNames: ['true', 'false'],
  properties: [
    { name: 'value1', displayName: '值 1 (表达式)', type: 'string' },
    {
      name: 'operator',
      displayName: '比较',
      type: 'options',
      default: 'equals',
      expression: false,
      options: [
        { label: '等于', value: 'equals' },
        { label: '不等于', value: 'notEquals' },
        { label: '包含', value: 'contains' },
        { label: '大于', value: 'gt' },
        { label: '大于等于', value: 'gte' },
        { label: '小于', value: 'lt' },
        { label: '小于等于', value: 'lte' },
        { label: '为空', value: 'isEmpty' },
        { label: '不为空', value: 'isNotEmpty' },
        { label: '为真', value: 'isTrue' },
      ],
    },
    { name: 'value2', displayName: '值 2 (表达式)', type: 'string' },
  ],
  execute: (ctx) => {
    const trueItems: DataItem[] = [];
    const falseItems: DataItem[] = [];
    const op = String(ctx.getRawParam('operator') ?? 'equals') as Operator;
    ctx.input.forEach((item, i) => {
      const v1 = ctx.getParam('value1', i);
      const v2 = ctx.getParam('value2', i);
      (compare(v1, op, v2) ? trueItems : falseItems).push(item);
    });
    return [trueItems, falseItems];
  },
};

/**
 * Switch: 用一个表达式的值匹配规则, 命中第 k 条规则走端口 k, 否则走最后的 fallback 端口。
 * 输出端口数 = 规则数 + 1。
 */
export const switchNode: NodeDefinition = {
  type: 'switch',
  displayName: 'Switch 多路',
  group: 'logic',
  description: '按表达式取值匹配规则, 分流到对应分支 (末端口为兜底)',
  properties: [
    { name: 'value', displayName: '取值 (表达式)', type: 'string' },
    {
      name: 'rules',
      displayName: '规则 (JSON 数组: [{ "equals": "x" }])',
      type: 'json',
      default: [],
      expression: false,
    },
  ],
  execute: (ctx) => {
    const rules = (ctx.getRawParam('rules') as Array<{ equals: unknown }>) ?? [];
    const ports: DataItem[][] = Array.from({ length: rules.length + 1 }, () => []);
    ctx.input.forEach((item, i) => {
      const value = ctx.getParam('value', i);
      const idx = rules.findIndex((r) => String(r.equals) === String(value));
      ports[idx === -1 ? rules.length : idx].push(item);
    });
    return ports;
  },
};
