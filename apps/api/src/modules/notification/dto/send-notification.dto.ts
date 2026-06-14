import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString, Length } from 'class-validator';

export class SendNotificationDto {
  @ApiProperty({ description: '接收方 (邮箱 / 手机号 / 频道 id)', example: 'ops@example.com' })
  @IsString()
  @Length(1, 256)
  to!: string;

  @ApiPropertyOptional({ description: '标题 / 主题' })
  @IsOptional()
  @IsString()
  @Length(0, 256)
  subject?: string;

  @ApiProperty({ description: '正文内容' })
  @IsString()
  @Length(1, 4096)
  content!: string;

  @ApiPropertyOptional({ description: '附加数据 (模板变量等)' })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
