import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class RedeemCardDto {
  @ApiProperty({ description: '卡号 (展示用)', example: 'NESTOR-XXXX-XXXX-XXXX' })
  @IsString()
  @Length(1, 64)
  code!: string;

  @ApiProperty({ description: '卡密 (校验用)' })
  @IsString()
  @Length(1, 128)
  secret!: string;
}
