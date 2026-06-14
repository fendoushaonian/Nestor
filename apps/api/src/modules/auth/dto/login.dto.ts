import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'alice', description: '用户名 / 邮箱 / 手机号' })
  @IsString()
  @Length(1, 128)
  identifier!: string;

  @ApiProperty({ example: 'P@ssw0rd' })
  @IsString()
  @Length(1, 64)
  password!: string;
}
