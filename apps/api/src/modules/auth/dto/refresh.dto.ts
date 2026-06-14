import { ApiProperty } from '@nestjs/swagger';
import { IsJWT } from 'class-validator';

export class RefreshDto {
  @ApiProperty({ description: '登录时返回的 refreshToken' })
  @IsJWT()
  refreshToken!: string;
}
