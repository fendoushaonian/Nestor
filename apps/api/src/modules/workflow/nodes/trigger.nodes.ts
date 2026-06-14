import { DataItem, NodeDefinition } from '../workflow.types';

/** 手动触发: 运行时把外部传入的初始数据原样输出。 */
export const manualTriggerNode: NodeDefinition = {
  type: 'manualTrigger',
  displayName: '手动触发',
  group: 'trigger',
  description: '手动运行工作流时的起点',
  execute: (ctx) => [ctx.input.length ? ctx.input : [{ json: {} }]],
};

/** Webhook 触发: 运行时输出收到的请求数据 (body/query/headers)。 */
export const webhookTriggerNode: NodeDefinition = {
  type: 'webhook',
  displayName: 'Webhook 触发',
  group: 'trigger',
  description: '通过 /api/webhook/:path 接收外部请求触发工作流',
  properties: [
    {
      name: 'path',
      displayName: 'Webhook 路径',
      type: 'string',
      required: true,
      expression: false,
      description: '唯一路径, 访问 /api/webhook/{path} 触发',
    },
    {
      name: 'method',
      displayName: 'HTTP 方法',
      type: 'options',
      default: 'POST',
      expression: false,
      options: [
        { label: 'GET', value: 'GET' },
        { label: 'POST', value: 'POST' },
      ],
    },
  ],
  execute: (ctx) => [ctx.input.length ? ctx.input : [{ json: {} }]],
};

/** 定时触发: 由调度器按 cron 触发, 运行时输出一条带时间戳的数据。 */
export const scheduleTriggerNode: NodeDefinition = {
  type: 'schedule',
  displayName: '定时触发',
  group: 'trigger',
  description: '按 cron 表达式定时运行 (工作流 active 时挂载)',
  properties: [
    {
      name: 'cron',
      displayName: 'Cron 表达式',
      type: 'string',
      required: true,
      expression: false,
      default: '0 * * * *',
      description: '标准 5/6 段 cron, 如 "0 * * * *" 每小时',
    },
  ],
  execute: (ctx) => {
    const seeded: DataItem[] = ctx.input.length
      ? ctx.input
      : [{ json: { timestamp: new Date().toISOString() } }];
    return [seeded];
  },
};
