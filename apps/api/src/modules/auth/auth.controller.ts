import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { AuthUser } from './auth.types';
import { CurrentUser } from './decorators/current-user.decorator';
import { Public } from './decorators/public.decorator';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  @ApiOperation({ summary: '注册 (返回 access/refresh token)' })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  // 登录额外加严: 每分钟最多 10 次, 配合验证码/锁定防爆破
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('login')
  @ApiOperation({ summary: '登录 (支持用户名/邮箱/手机号)' })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.auth.login(dto, { ip: req.ip, userAgent: req.headers['user-agent'] });
  }

  @Public()
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Get('login/gate')
  @ApiOperation({ summary: '登录前置探测: 该账号当前是否需要验证码/已锁定' })
  loginGate(@Query('identifier') identifier: string) {
    return this.auth.loginGate(identifier ?? '');
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: '用 refreshToken 换取新的 token 对 (旧 refresh 失效)' })
  refresh(@Body() dto: RefreshDto) {
    return this.auth.refresh(dto.refreshToken);
  }

  @ApiBearerAuth()
  @Post('logout')
  @ApiOperation({ summary: '登出 (当前 access token 立即失效, 需启用 Redis)' })
  async logout(@CurrentUser() user: AuthUser) {
    await this.auth.logout(user);
    return { loggedOut: true };
  }

  @ApiBearerAuth()
  @Get('profile')
  @ApiOperation({ summary: '获取当前登录用户 (含角色/权限)' })
  profile(@CurrentUser() user: AuthUser) {
    return this.auth.getProfileView(user.id);
  }
}
