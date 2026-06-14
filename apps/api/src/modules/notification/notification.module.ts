import { Module } from '@nestjs/common';
import { notificationChannelFactory } from './channels/notification.factory';
import { NotificationController } from './notification.controller';
import { NotificationService } from './notification.service';

/**
 * 通知模块。提供可切换渠道 (console / webhook) 的统一通知能力,
 * 导出 NotificationService 供其它模块注入使用。
 */
@Module({
  controllers: [NotificationController],
  providers: [notificationChannelFactory, NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
