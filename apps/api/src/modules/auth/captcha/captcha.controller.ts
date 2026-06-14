import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '../decorators/public.decorator';
import { CaptchaService } from './captcha.service';

@ApiTags('auth-captcha')
@Controller('auth/captcha')
export class CaptchaController {
  constructor(private readonly captcha: CaptchaService) {}

  @Public()
  // 验证码本身也限流, 防止被刷爆缓存
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get()
  @ApiOperation({ summary: '获取图形验证码 (返回 captchaId + svg)' })
  generate() {
    return this.captcha.generate();
  }
}
