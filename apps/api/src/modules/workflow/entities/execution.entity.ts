import { BaseEntity } from '@nestor/core';
import { Column, Entity, Index } from 'typeorm';
import { NodeRunResult } from '../workflow.types';

export enum ExecutionStatus {
  RUNNING = 'running',
  SUCCESS = 'success',
  ERROR = 'error',
  CANCELED = 'canceled',
}

export enum ExecutionMode {
  MANUAL = 'manual',
  WEBHOOK = 'webhook',
  SCHEDULE = 'schedule',
  RETRY = 'retry',
}

/** 一次工作流运行的记录, 含每个节点的输入/输出快照 (便于回看与重跑)。 */
@Entity('executions')
export class Execution extends BaseEntity {
  @Index()
  @Column({ name: 'workflow_id', type: 'uuid' })
  workflowId!: string;

  @Column({ type: 'varchar', length: 16, default: ExecutionStatus.RUNNING })
  status!: ExecutionStatus;

  @Column({ type: 'varchar', length: 16, default: ExecutionMode.MANUAL })
  mode!: ExecutionMode;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt?: Date;

  @Column({ name: 'finished_at', type: 'datetime', nullable: true })
  finishedAt?: Date;

  @Column({ type: 'text', nullable: true })
  error?: string;

  /** 每个节点的运行结果快照 (status / 输出数据 / 耗时 / 错误) */
  @Column({ name: 'node_runs', type: 'simple-json', nullable: true })
  nodeRuns?: Record<string, NodeRunResult>;

  @Column({ name: 'triggered_by', type: 'uuid', nullable: true })
  triggeredBy?: string;
}
