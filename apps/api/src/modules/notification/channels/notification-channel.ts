/** 一条待发送的通知。 */
export interface NotificationMessage {
  /** 接收方: 邮箱 / 手机号 / 频道 id, 取决于具体渠道 */
  to: string;
  /** 标题 (邮件主题等; 部分渠道可忽略) */
  subject?: string;
  /** 正文 */
  content: string;
  /** 透传给渠道的附加数据 (如模板变量) */
  metadata?: Record<string, unknown>;
}

/** 发送结果。 */
export interface SendResult {
  channel: string;
  to: string;
  success: boolean;
  /** 渠道返回的消息 id (若有) */
  id?: string;
  /** 失败原因或附加说明 */
  detail?: string;
}

/**
 * 通知渠道抽象。不同实现 (控制台 / Webhook / 后续可扩展 SMTP、短信) 暴露统一的
 * send 接口, NotificationService 只依赖此接口, 通过配置选择具体实现。
 */
export interface NotificationChannel {
  readonly name: string;
  send(message: NotificationMessage): Promise<SendResult>;
}
