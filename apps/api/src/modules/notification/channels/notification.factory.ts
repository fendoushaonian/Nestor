import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Configuration } from '../../../config/configuration';
import { ConsoleNotificationChannel } from './console.channel';
import { NotificationChannel } from './notification-channel';
import { WebhookNotificationChannel } from './webhook.channel';

export const NOTIFICATION_CHANNEL = Symbol('NOTIFICATION_CHANNEL');

/** 按配置选择通知渠道, 作为可注入的 NotificationChannel 提供。 */
export const notificationChannelFactory: Provider = {
  provide: NOTIFICATION_CHANNEL,
  inject: [ConfigService],
  useFactory: (config: ConfigService<Configuration, true>): NotificationChannel => {
    const cfg = config.get('notification', { infer: true });
    switch (cfg.driver) {
      case 'webhook':
        return new WebhookNotificationChannel(cfg.webhook);
      case 'console':
      default:
        return new ConsoleNotificationChannel();
    }
  },
};
