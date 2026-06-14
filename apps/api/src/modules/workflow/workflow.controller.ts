import { Body, Controller, Delete, Get, Param, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { CreateWorkflowDto } from './dto/create-workflow.dto';
import { RunWorkflowDto } from './dto/run-workflow.dto';
import { UpdateWorkflowDto } from './dto/update-workflow.dto';
import { ExecutionService } from './execution.service';
import { NodeRegistry } from './nodes/node-registry';
import { WorkflowScheduleService } from './schedule.service';
import { WorkflowService } from './workflow.service';

@ApiTags('workflow')
@ApiBearerAuth()
@Controller('workflows')
export class WorkflowController {
  constructor(
    private readonly workflows: WorkflowService,
    private readonly executions: ExecutionService,
    private readonly nodes: NodeRegistry,
    private readonly schedule: WorkflowScheduleService,
  ) {}

  @Get('node-types')
  @Permissions('workflow:read')
  @ApiOperation({ summary: '可用节点目录 (前端渲染节点面板)' })
  nodeTypes() {
    return this.nodes.list();
  }

  @Get()
  @Permissions('workflow:read')
  @ApiOperation({ summary: '工作流列表 (分页)' })
  list(@Query() q: PaginationQueryDto) {
    return this.workflows.list(q.page, q.pageSize);
  }

  @Post()
  @Permissions('workflow:write')
  @ApiOperation({ summary: '创建工作流' })
  async create(@Body() dto: CreateWorkflowDto, @CurrentUser() user?: AuthUser) {
    const workflow = await this.workflows.create(dto, user?.id);
    await this.schedule.resync(workflow.id);
    return workflow;
  }

  @Get(':id')
  @Permissions('workflow:read')
  @ApiOperation({ summary: '工作流详情' })
  get(@Param('id') id: string) {
    return this.workflows.get(id);
  }

  @Put(':id')
  @Permissions('workflow:write')
  @ApiOperation({ summary: '更新工作流' })
  async update(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    const workflow = await this.workflows.update(id, dto);
    await this.schedule.resync(id);
    return workflow;
  }

  @Post(':id/activate')
  @Permissions('workflow:write')
  @ApiOperation({ summary: '启用/停用工作流 (挂载或卸载触发器)' })
  async activate(@Param('id') id: string, @Body('active') active: boolean) {
    const workflow = await this.workflows.setActive(id, active);
    await this.schedule.resync(id);
    return workflow;
  }

  @Delete(':id')
  @Permissions('workflow:write')
  @ApiOperation({ summary: '删除工作流' })
  async remove(@Param('id') id: string) {
    await this.workflows.remove(id);
    this.schedule.unregister(id);
    return { removed: true };
  }

  @Post(':id/run')
  @Permissions('workflow:write')
  @ApiOperation({ summary: '手动运行工作流' })
  run(@Param('id') id: string, @Body() dto: RunWorkflowDto, @CurrentUser() user?: AuthUser) {
    return this.executions.run(id, {
      startNodeId: dto.startNodeId,
      input: dto.input,
      triggeredBy: user?.id,
    });
  }

  @Get(':id/executions')
  @Permissions('workflow:read')
  @ApiOperation({ summary: '工作流的执行历史 (分页)' })
  executionsOf(@Param('id') id: string, @Query() q: PaginationQueryDto) {
    return this.executions.list(id, q.page, q.pageSize);
  }
}
