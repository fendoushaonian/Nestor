import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'alice', description: '用户名 / 邮箱 / 手机号' })
  @IsString()
  @Length(1, 128)
  identifier!: string;

  @ApiProperty({ example: 'P@ssw0rd' })
  @IsString()
  @Length(1, 64)
  password!: string;

  @ApiPropertyOptional({ description: '图形验证码标识 (GET /auth/captcha 获取)' })
  @IsOptional()
  @IsString()
  captchaId?: string;

  @ApiPropertyOptional({ description: '用户输入的图形验证码文本' })
  @IsOptional()
  @IsString()
  captchaText?: string;
}
