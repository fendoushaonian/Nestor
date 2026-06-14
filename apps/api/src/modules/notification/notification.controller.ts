import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { SendNotificationDto } from './dto/send-notification.dto';
import { NotificationService } from './notification.service';

@ApiTags('notification')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Get('channel')
  @Permissions('notification:read')
  @ApiOperation({ summary: '查看当前生效的通知渠道' })
  channel() {
    return { driver: this.notifications.driver };
  }

  @Post()
  @Permissions('notification:send')
  @ApiOperation({ summary: '通过当前渠道发送一条通知' })
  send(@Body() dto: SendNotificationDto) {
    return this.notifications.send(dto);
  }
}
