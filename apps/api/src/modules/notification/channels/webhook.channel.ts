import { Logger } from '@nestjs/common';
import { NotificationConfig } from '../../../config/configuration';
import { NotificationChannel, NotificationMessage, SendResult } from './notification-channel';

/**
 * 通用 Webhook 渠道。把通知作为 JSON POST 到配置的 url, 可对接飞书 / Slack /
 * 企业微信机器人 / 自建网关。基于全局 fetch (Node 20+), 不引入额外依赖。
 */
export class WebhookNotificationChannel implements NotificationChannel {
  readonly name = 'webhook';
  private readonly logger = new Logger('Notification');

  constructor(private readonly cfg: NotificationConfig['webhook']) {}

  async send(message: NotificationMessage): Promise<SendResult> {
    if (!this.cfg.url) {
      return {
        channel: this.name,
        to: message.to,
        success: false,
        detail: 'NOTIFICATION_WEBHOOK_URL 未配置',
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.cfg.timeoutMs);
    try {
      const res = await fetch(this.cfg.url, {
        method: this.cfg.method || 'POST',
        headers: { 'Content-Type': 'application/json', ...this.cfg.headers },
        body: JSON.stringify(message),
        signal: controller.signal,
      });
      if (!res.ok) {
        return {
          channel: this.name,
          to: message.to,
          success: false,
          detail: `webhook responded ${res.status}`,
        };
      }
      return { channel: this.name, to: message.to, success: true };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      this.logger.warn(`webhook 发送失败: ${detail}`);
      return { channel: this.name, to: message.to, success: false, detail };
    } finally {
      clearTimeout(timer);
    }
  }
}
