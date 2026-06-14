import { Injectable } from '@nestjs/common';
import { NodeDefinition } from '../workflow.types';
import { codeNode, mergeNode, noOpNode, setNode, waitNode } from './data.nodes';
import { httpRequestNode } from './http-request.node';
import { ifNode, switchNode } from './logic.nodes';
import { manualTriggerNode, scheduleTriggerNode, webhookTriggerNode } from './trigger.nodes';

const ALL_NODES: NodeDefinition[] = [
  manualTriggerNode,
  webhookTriggerNode,
  scheduleTriggerNode,
  httpRequestNode,
  setNode,
  ifNode,
  switchNode,
  mergeNode,
  codeNode,
  waitNode,
  noOpNode,
];

const TRIGGER_TYPES = new Set(['manualTrigger', 'webhook', 'schedule']);

/** 节点类型注册表: 引擎按 type 查执行器, 前端按它渲染可用节点列表。 */
@Injectable()
export class NodeRegistry {
  private readonly registry = new Map<string, NodeDefinition>();

  constructor() {
    for (const def of ALL_NODES) {
      this.registry.set(def.type, def);
    }
  }

  get(type: string): NodeDefinition | undefined {
    return this.registry.get(type);
  }

  getOrThrow(type: string): NodeDefinition {
    const def = this.registry.get(type);
    if (!def) throw new Error(`未知节点类型: ${type}`);
    return def;
  }

  isTrigger(type: string): boolean {
    return TRIGGER_TYPES.has(type);
  }

  /** 供前端渲染的节点目录 (不含 execute) */
  list(): Array<Omit<NodeDefinition, 'execute'>> {
    return [...this.registry.values()].map((d) => ({
      type: d.type,
      displayName: d.displayName,
      group: d.group,
      description: d.description,
      outputs: d.outputs,
      outputNames: d.outputNames,
      properties: d.properties,
    }));
  }
}
