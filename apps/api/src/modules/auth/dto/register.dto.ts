import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Length, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'alice', description: '用户名, 4-64 位字母数字下划线' })
  @IsString()
  @Length(4, 64)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'username 仅允许字母数字下划线' })
  username!: string;

  @ApiProperty({ example: 'P@ssw0rd', description: '密码, 6-64 位' })
  @IsString()
  @Length(6, 64)
  password!: string;

  @ApiPropertyOptional({ example: 'alice@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'Alice' })
  @IsOptional()
  @IsString()
  @Length(1, 64)
  nickname?: string;
}
