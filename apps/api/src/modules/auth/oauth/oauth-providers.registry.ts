import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../../config/configuration';
import { AppleProvider } from './providers/apple.provider';
import { GithubProvider } from './providers/github.provider';
import { GoogleProvider } from './providers/google.provider';
import { OAuthProvider } from './providers/types';
import { WechatProvider } from './providers/wechat.provider';

/** 按配置实例化全部 provider, 并提供按名查找。 */
@Injectable()
export class OAuthProvidersRegistry {
  private readonly providers: Map<string, OAuthProvider>;

  constructor(config: ConfigService<Configuration, true>) {
    const cfg = config.get('oauth', { infer: true });
    const list: OAuthProvider[] = [
      new GoogleProvider(cfg.google),
      new GithubProvider(cfg.github),
      new WechatProvider(cfg.wechat),
      new AppleProvider(cfg.apple),
    ];
    this.providers = new Map(list.map((p) => [p.name, p]));
  }

  get(name: string): OAuthProvider | undefined {
    return this.providers.get(name);
  }

  /** 已正确配置且启用的 provider 名称列表。 */
  enabledNames(): string[] {
    return [...this.providers.values()].filter((p) => p.isConfigured()).map((p) => p.name);
  }
}
