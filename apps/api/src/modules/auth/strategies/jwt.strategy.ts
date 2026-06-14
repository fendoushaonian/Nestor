import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Configuration } from '../../../config/configuration';
import { AuthUser, JwtPayload } from '../auth.types';
import { TokenService } from '../token.service';

/**
 * access token 校验策略: 解析 Bearer token, 校验签名/过期, 并查登出黑名单。
 * 通过后把用户信息注入 request.user。
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService<Configuration, true>,
    private readonly tokens: TokenService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get('jwt', { infer: true }).accessSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    if (payload.type !== 'access') {
      throw new UnauthorizedException('token 类型错误');
    }
    if (await this.tokens.isAccessRevoked(payload.jti)) {
      throw new UnauthorizedException('token 已登出');
    }
    return {
      id: payload.sub,
      username: payload.username,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      jti: payload.jti,
      exp: payload.exp,
    };
  }
}
