import { All, Controller, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ErrorCode } from '@nestor/core';
import { Request } from 'express';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Public } from '../auth/decorators/public.decorator';
import { ExecutionService } from './execution.service';
import { ExecutionMode } from './entities/execution.entity';
import { Workflow } from './entities/workflow.entity';
import { WorkflowService } from './workflow.service';

@ApiTags('workflow')
@Controller('webhook')
export class WebhookController {
  constructor(
    private readonly workflows: WorkflowService,
    private readonly executions: ExecutionService,
  ) {}

  @Public()
  @All(':path')
  @ApiOperation({ summary: '外部 Webhook 入口, 按 path 触发对应工作流' })
  async handle(@Param('path') path: string, @Req() req: Request) {
    const match = await this.findByPath(path, req.method);
    if (!match) {
      throw new BusinessException(ErrorCode.WEBHOOK_NOT_FOUND, `没有匹配的 Webhook: ${path}`);
    }

    const execution = await this.executions.runWorkflow(
      match.workflow,
      [
        {
          json: {
            body: req.body as unknown,
            query: req.query,
            headers: req.headers,
            method: req.method,
          },
        },
      ],
      { mode: ExecutionMode.WEBHOOK, startNodeId: match.nodeId },
    );

    return { executionId: execution.id, status: execution.status };
  }

  private async findByPath(
    path: string,
    method: string,
  ): Promise<{ workflow: Workflow; nodeId: string } | undefined> {
    const active = await this.workflows.listActive();
    for (const workflow of active) {
      for (const node of workflow.graph?.nodes ?? []) {
        if (node.type !== 'webhook') continue;
        const nodePath = String(node.parameters?.path ?? '');
        const nodeMethod = String(node.parameters?.method ?? 'POST').toUpperCase();
        if (nodePath === path && (nodeMethod === method.toUpperCase() || nodeMethod === 'ANY')) {
          return { workflow, nodeId: node.id };
        }
      }
    }
    return undefined;
  }
}
