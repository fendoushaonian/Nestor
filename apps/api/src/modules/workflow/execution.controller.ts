import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { ExecutionService } from './execution.service';

@ApiTags('workflow')
@ApiBearerAuth()
@Controller('executions')
export class ExecutionController {
  constructor(private readonly executions: ExecutionService) {}

  @Get()
  @Permissions('workflow:read')
  @ApiOperation({ summary: '所有执行记录 (分页, 可按 workflowId 过滤)' })
  list(@Query() q: PaginationQueryDto, @Query('workflowId') workflowId?: string) {
    return this.executions.list(workflowId, q.page, q.pageSize);
  }

  @Get(':id')
  @Permissions('workflow:read')
  @ApiOperation({ summary: '执行详情 (含每节点输入/输出快照)' })
  get(@Param('id') id: string) {
    return this.executions.get(id);
  }

  @Post(':id/rerun')
  @Permissions('workflow:write')
  @ApiOperation({ summary: '重跑 (传 startNodeId 则从该节点起跑)' })
  rerun(@Param('id') id: string, @Body('startNodeId') startNodeId?: string) {
    return this.executions.rerun(id, startNodeId);
  }
}
