import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from 'class-validator';

export class GenerateCardsDto {
  @ApiProperty({ example: '双十一活动批次' })
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiProperty({ description: '该批次卡密绑定的商品 id' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 100, description: '生成数量, 1-100000' })
  @IsInt()
  @Min(1)
  @Max(100000)
  count!: number;

  @ApiPropertyOptional({ example: 365, description: '卡密自激活起有效天数, 0=永久' })
  @IsOptional()
  @IsInt()
  @Min(0)
  expireDays?: number;

  @ApiPropertyOptional({ example: '活动备注' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  remark?: string;
}
