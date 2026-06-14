import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode, paginate, PaginatedResult } from '@nestor/shared';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { CredentialService } from './credential.service';
import { WorkflowEngine } from './engine.service';
import { Execution, ExecutionMode, ExecutionStatus } from './entities/execution.entity';
import { Workflow } from './entities/workflow.entity';
import { WorkflowService } from './workflow.service';
import { DataItem } from './workflow.types';

export interface RunParams {
  mode?: ExecutionMode;
  startNodeId?: string;
  /** 传给起始节点的初始数据 */
  input?: Record<string, unknown>;
  triggeredBy?: string;
}

@Injectable()
export class ExecutionService {
  constructor(
    @InjectRepository(Execution) private readonly executions: Repository<Execution>,
    private readonly workflowService: WorkflowService,
    private readonly credentials: CredentialService,
    private readonly engine: WorkflowEngine,
  ) {}

  /** 跑一个已存在的工作流 */
  async run(workflowId: string, params: RunParams = {}): Promise<Execution> {
    const workflow = await this.workflowService.get(workflowId);
    const seed: DataItem[] = [{ json: params.input ?? {} }];
    return this.runWorkflow(workflow, seed, params);
  }

  /** 跑一个工作流对象 (Webhook/调度器内部用, 已持有实体) */
  async runWorkflow(
    workflow: Workflow,
    seed: DataItem[],
    params: RunParams = {},
  ): Promise<Execution> {
    const execution = await this.executions.save(
      this.executions.create({
        workflowId: workflow.id,
        status: ExecutionStatus.RUNNING,
        mode: params.mode ?? ExecutionMode.MANUAL,
        startedAt: new Date(),
        triggeredBy: params.triggeredBy,
      }),
    );

    const result = await this.engine.run(workflow.graph ?? { nodes: [], connections: [] }, {
      startNodeId: params.startNodeId,
      seed,
      resolveCredential: (id) => this.credentials.getDecrypted(id),
    });

    execution.status =
      result.status === 'success' ? ExecutionStatus.SUCCESS : ExecutionStatus.ERROR;
    execution.nodeRuns = result.nodeRuns;
    execution.error = result.error;
    execution.finishedAt = new Date();
    return this.executions.save(execution);
  }

  async list(
    workflowId: string | undefined,
    page: number,
    pageSize: number,
  ): Promise<PaginatedResult<Execution>> {
    const [list, total] = await this.executions.findAndCount({
      where: workflowId ? { workflowId } : {},
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return paginate(list, total, page, pageSize);
  }

  async get(id: string): Promise<Execution> {
    const execution = await this.executions.findOne({ where: { id } });
    if (!execution) {
      throw new BusinessException(ErrorCode.EXECUTION_NOT_FOUND, `执行记录 ${id} 不存在`);
    }
    return execution;
  }

  /** 重跑: 不传 startNodeId 从头跑; 传了则用该节点上次的输入快照, 从该节点起跑。 */
  async rerun(executionId: string, startNodeId?: string): Promise<Execution> {
    const original = await this.get(executionId);
    const workflow = await this.workflowService.get(original.workflowId);

    let seed: DataItem[] = [{ json: {} }];
    if (startNodeId) {
      const node = workflow.graph?.nodes.find((n) => n.id === startNodeId);
      const snapshot = node ? original.nodeRuns?.[node.name] : undefined;
      if (snapshot?.input?.length) seed = snapshot.input;
    }

    return this.runWorkflow(workflow, seed, { mode: ExecutionMode.RETRY, startNodeId });
  }
}
