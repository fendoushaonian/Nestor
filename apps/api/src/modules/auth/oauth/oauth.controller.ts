import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../decorators/public.decorator';
import { IssuedTokens } from '../token.service';
import { OAuthService } from './oauth.service';

/**
 * 第三方登录(OAuth2 授权码流程):
 *   GET  /auth/oauth/providers          → 已启用的 provider 列表
 *   GET  /auth/oauth/:provider          → 302 跳转到第三方授权页
 *   GET  /auth/oauth/:provider/callback → 授权回调(标准 provider)
 *   POST /auth/oauth/:provider/callback → 授权回调(Apple form_post)
 */
@ApiTags('auth-oauth')
@Controller('auth/oauth')
export class OAuthController {
  constructor(private readonly oauth: OAuthService) {}

  @Public()
  @Get('providers')
  @ApiOperation({ summary: '已启用的第三方登录方式' })
  providers() {
    return { providers: this.oauth.enabledProviders() };
  }

  @Public()
  @Get(':provider')
  @ApiOperation({ summary: '发起第三方登录, 302 跳转到授权页' })
  async start(@Param('provider') provider: string, @Res() res: Response) {
    const { url } = await this.oauth.authorize(provider);
    res.redirect(url);
  }

  @Public()
  @Get(':provider/callback')
  @ApiOperation({ summary: '第三方登录回调 (GET)' })
  async callbackGet(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const tokens = await this.oauth.handleCallback(provider, code, state);
    this.respond(res, tokens);
  }

  @Public()
  @Post(':provider/callback')
  @ApiOperation({ summary: '第三方登录回调 (POST form_post, 用于 Apple)' })
  async callbackPost(
    @Param('provider') provider: string,
    @Body('code') code: string,
    @Body('state') state: string,
    @Res() res: Response,
  ) {
    const tokens = await this.oauth.handleCallback(provider, code, state);
    this.respond(res, tokens);
  }

  /** 配置了前端回跳地址则 302 带 token, 否则直接返回 JSON。 */
  private respond(res: Response, tokens: IssuedTokens): void {
    const redirect = this.oauth.successRedirect();
    if (redirect) {
      const url = new URL(redirect);
      url.hash = new URLSearchParams({
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_type: tokens.tokenType,
      }).toString();
      res.redirect(url.toString());
      return;
    }
    res.json(tokens);
  }
}
