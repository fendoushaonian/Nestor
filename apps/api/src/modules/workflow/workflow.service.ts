import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode, paginate, PaginatedResult } from '@nestor/shared';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { Workflow } from './entities/workflow.entity';

@Injectable()
export class WorkflowService {
  constructor(@InjectRepository(Workflow) private readonly workflows: Repository<Workflow>) {}

  create(dto: CreateWorkflowDto, userId?: string): Promise<Workflow> {
    const workflow = this.workflows.create({
      name: dto.name,
      description: dto.description,
      active: dto.active ?? false,
      graph: dto.graph ?? { nodes: [], connections: [] },
      createdBy: userId,
    });
    return this.workflows.save(workflow);
  }

  async list(page: number, pageSize: number): Promise<PaginatedResult<Workflow>> {
    const [list, total] = await this.workflows.findAndCount({
      order: { updatedAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return paginate(list, total, page, pageSize);
  }

  async get(id: string): Promise<Workflow> {
    const workflow = await this.workflows.findOne({ where: { id } });
    if (!workflow) {
      throw new BusinessException(ErrorCode.WORKFLOW_NOT_FOUND, `工作流 ${id} 不存在`);
    }
    return workflow;
  }

  async update(id: string, dto: UpdateWorkflowDto): Promise<Workflow> {
    const workflow = await this.get(id);
    if (dto.name !== undefined) workflow.name = dto.name;
    if (dto.description !== undefined) workflow.description = dto.description;
    if (dto.active !== undefined) workflow.active = dto.active;
    if (dto.graph !== undefined) workflow.graph = dto.graph;
    return this.workflows.save(workflow);
  }

  async setActive(id: string, active: boolean): Promise<Workflow> {
    const workflow = await this.get(id);
    workflow.active = active;
    return this.workflows.save(workflow);
  }

  async remove(id: string): Promise<void> {
    const workflow = await this.get(id);
    await this.workflows.remove(workflow);
  }

  /** 所有启用的工作流 (调度器/Webhook 启动时挂载触发器用) */
  listActive(): Promise<Workflow[]> {
    return this.workflows.find({ where: { active: true } });
  }
}
