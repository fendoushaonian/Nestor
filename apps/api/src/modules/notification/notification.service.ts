import { Inject, Injectable } from '@nestjs/common';
import { ErrorCode } from '@nestor/shared';
import { BusinessException } from '../../common/exceptions/business.exception';
import { NOTIFICATION_CHANNEL } from './channels/notification.factory';
import {
  NotificationChannel,
  NotificationMessage,
  SendResult,
} from './channels/notification-channel';

/**
 * 通知服务。对外提供统一的 send 接口, 底层渠道由配置 (NOTIFICATION_DRIVER) 决定,
 * 业务代码无需关心是控制台还是 Webhook。其它模块可注入本服务发送通知。
 */
@Injectable()
export class NotificationService {
  constructor(@Inject(NOTIFICATION_CHANNEL) private readonly channel: NotificationChannel) {}

  /** 当前生效的渠道名 (console / webhook)。 */
  get driver(): string {
    return this.channel.name;
  }

  /** 发送一条通知; 渠道返回失败时抛出业务异常。 */
  async send(message: NotificationMessage): Promise<SendResult> {
    const result = await this.channel.send(message);
    if (!result.success) {
      throw new BusinessException(
        ErrorCode.NOTIFICATION_SEND_FAILED,
        result.detail ?? '通知发送失败',
      );
    }
    return result;
  }
}
