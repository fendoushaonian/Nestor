import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../../config/configuration';
import { LocalStorageProvider } from './local.provider';
import { OssStorageProvider } from './oss.provider';
import { S3StorageProvider } from './s3.provider';
import { StorageProvider } from './storage-provider';

export const STORAGE_PROVIDER = Symbol('STORAGE_PROVIDER');

/** 按配置选择存储驱动, 作为可注入的 StorageProvider 提供。 */
export const storageProviderFactory: Provider = {
  provide: STORAGE_PROVIDER,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Configuration, true>): StorageProvider => {
    const cfg = config.get('storage', { infer: true });
    switch (cfg.driver) {
      case 's3':
        return new S3StorageProvider(cfg.s3);
      case 'oss':
        return new OssStorageProvider(cfg.oss);
      case 'local':
      default:
        return new LocalStorageProvider(cfg.local.dir, cfg.local.publicBaseUrl);
    }
  },
};
