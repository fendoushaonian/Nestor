import { BaseEntity } from '@nestor/shared';
import { Column, Entity, Index } from 'typeorm';
import { WorkflowGraph } from '../workflow.types';

/** 工作流定义: 存节点图 (nodes + connections), active 控制触发器是否挂载。 */
@Entity('workflows')
export class Workflow extends BaseEntity {
  @Column({ length: 128 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Index()
  @Column({ default: false })
  active!: boolean;

  /** 节点图 (跨数据库用 simple-json 存为文本) */
  @Column({ type: 'simple-json', nullable: true })
  graph?: WorkflowGraph;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;
}
