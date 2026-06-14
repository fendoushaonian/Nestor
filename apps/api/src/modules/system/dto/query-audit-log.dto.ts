import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, Length } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryAuditLogDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按操作人用户 ID 过滤' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: '按动作过滤 (精确匹配)' })
  @IsOptional()
  @IsString()
  @Length(1, 128)
  action?: string;
}
