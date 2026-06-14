import { ApiProperty } from '@nestjs/swagger';
import { IsObject, IsString, Length } from 'class-validator';

export class CreateCredentialDto {
  @ApiProperty({ description: '凭证名称' })
  @IsString()
  @Length(1, 128)
  name!: string;

  @ApiProperty({
    description: '凭证类型',
    example: 'httpHeaderAuth',
  })
  @IsString()
  @Length(1, 64)
  type!: string;

  @ApiProperty({
    description: '凭证明文数据 (加密后落库), 如 { headerName, headerValue }',
  })
  @IsObject()
  data!: Record<string, unknown>;
}
