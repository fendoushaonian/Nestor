import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsObject, IsOptional, IsString, Length } from 'class-validator';
import { WorkflowGraph } from '../workflow.types';

export class CreateWorkflowDto {
  @ApiProperty({ description: '工作流名称' })
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: '是否启用 (启用后挂载触发器)' })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ description: '节点图 { nodes, connections }' })
  @IsOptional()
  @IsObject()
  graph?: WorkflowGraph;
}
