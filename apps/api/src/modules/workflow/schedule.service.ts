import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { ExecutionMode } from './entities/execution.entity';
import { Workflow } from './entities/workflow.entity';
import { ExecutionService } from './execution.service';
import { WorkflowService } from './workflow.service';

const JOB_PREFIX = 'wf:';

/** 把启用工作流里的「定时触发」节点注册为 cron 任务; 工作流变更时重新同步。 */
@Injectable()
export class WorkflowScheduleService implements OnModuleInit {
  private readonly logger = new Logger(WorkflowScheduleService.name);

  constructor(
    private readonly registry: SchedulerRegistry,
    private readonly workflows: WorkflowService,
    private readonly executions: ExecutionService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.syncAll();
  }

  /** 清空并按当前启用工作流重建所有定时任务 */
  async syncAll(): Promise<void> {
    for (const name of this.listJobNames()) this.removeJob(name);
    const active = await this.workflows.listActive();
    for (const wf of active) this.registerWorkflow(wf);
  }

  /** 单个工作流变更后的增量同步 */
  async resync(workflowId: string): Promise<void> {
    this.unregister(workflowId);
    const wf = await this.workflows.get(workflowId);
    if (wf.active) this.registerWorkflow(wf);
  }

  /** 仅移除某工作流的定时任务(用于删除场景, 不再回查工作流, 避免抛 NOT_FOUND)。 */
  unregister(workflowId: string): void {
    for (const name of this.listJobNames()) {
      if (name.startsWith(`${JOB_PREFIX}${workflowId}:`)) this.removeJob(name);
    }
  }

  private registerWorkflow(wf: Workflow): void {
    for (const node of wf.graph?.nodes ?? []) {
      if (node.type !== 'schedule') continue;
      const cron = String(node.parameters?.cron ?? '').trim();
      if (!cron) continue;
      const name = `${JOB_PREFIX}${wf.id}:${node.id}`;
      try {
        const job = new CronJob(cron, () => {
          void this.fire(wf.id, node.id);
        });
        this.registry.addCronJob(name, job as unknown as CronJob);
        job.start();
        this.logger.log(`挂载定时任务 ${name} (${cron})`);
      } catch (err) {
        this.logger.warn(`定时任务 ${name} 注册失败: ${(err as Error).message}`);
      }
    }
  }

  private async fire(workflowId: string, nodeId: string): Promise<void> {
    try {
      await this.executions.run(workflowId, {
        mode: ExecutionMode.SCHEDULE,
        startNodeId: nodeId,
        input: { timestamp: new Date().toISOString() },
      });
    } catch (err) {
      this.logger.error(`定时触发工作流 ${workflowId} 失败: ${(err as Error).message}`);
    }
  }

  private listJobNames(): string[] {
    const names: string[] = [];
    for (const [name] of this.registry.getCronJobs()) {
      if (name.startsWith(JOB_PREFIX)) names.push(name);
    }
    return names;
  }

  private removeJob(name: string): void {
    try {
      this.registry.deleteCronJob(name);
    } catch {
      // 已不存在, 忽略
    }
  }
}
