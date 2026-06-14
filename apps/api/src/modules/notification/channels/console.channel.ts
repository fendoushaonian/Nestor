import { Logger } from '@nestjs/common';
import { NotificationChannel, NotificationMessage, SendResult } from './notification-channel';

/**
 * 控制台渠道 (默认)。把通知打到日志, 不依赖任何外部服务,
 * 适合本地开发 / 未配置真实渠道时的兜底。
 */
export class ConsoleNotificationChannel implements NotificationChannel {
  readonly name = 'console';
  private readonly logger = new Logger('Notification');

  async send(message: NotificationMessage): Promise<SendResult> {
    this.logger.log(
      `[notify] to=${message.to}${message.subject ? ` subject=${message.subject}` : ''} content=${message.content}`,
    );
    return { channel: this.name, to: message.to, success: true };
  }
}
