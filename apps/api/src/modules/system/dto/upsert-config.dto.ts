import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class UpsertConfigDto {
  @ApiProperty({ example: '订单超时关闭', description: '配置值' })
  @IsOptional()
  @IsString()
  value?: string;

  @ApiPropertyOptional({ example: 'order', description: '配置分组' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  group?: string;

  @ApiPropertyOptional({ example: '下单后多久未支付自动关闭', description: '说明' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
