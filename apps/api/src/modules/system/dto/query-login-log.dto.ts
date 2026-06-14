import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, Length } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryLoginLogDto extends PaginationQueryDto {
  @ApiPropertyOptional({ description: '按用户名过滤 (精确匹配)' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  username?: string;

  @ApiPropertyOptional({ description: '按是否登录成功过滤' })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === 'true' || value === true) return true;
    if (value === 'false' || value === false) return false;
    return value;
  })
  @IsBoolean()
  success?: boolean;
}
