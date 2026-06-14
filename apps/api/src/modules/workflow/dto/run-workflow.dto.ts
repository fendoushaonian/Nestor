import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';

export class RunWorkflowDto {
  @ApiPropertyOptional({ description: '起始节点 id, 不传则用第一个触发节点' })
  @IsOptional()
  @IsString()
  startNodeId?: string;

  @ApiPropertyOptional({ description: '传给起始节点的初始数据' })
  @IsOptional()
  @IsObject()
  input?: Record<string, unknown>;
}
