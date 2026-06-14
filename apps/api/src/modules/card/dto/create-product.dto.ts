import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsInt, IsOptional, IsString, Length, Min } from 'class-validator';
import { ProductType } from '../entities/product.entity';

export class CreateProductDto {
  @ApiProperty({ example: '月度会员' })
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiProperty({ enum: ProductType, example: ProductType.MEMBERSHIP })
  @IsEnum(ProductType)
  type!: ProductType;

  @ApiPropertyOptional({ example: 30, description: '会员时长(天), MEMBERSHIP 用' })
  @IsOptional()
  @IsInt()
  @Min(0)
  durationDays?: number;

  @ApiPropertyOptional({ example: 100, description: '额度数量, QUOTA 用' })
  @IsOptional()
  @IsInt()
  @Min(0)
  quota?: number;

  @ApiPropertyOptional({ example: '每月会员权益' })
  @IsOptional()
  @IsString()
  @Length(0, 255)
  description?: string;
}
