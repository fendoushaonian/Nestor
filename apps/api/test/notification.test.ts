import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorCode } from '@nestor/shared';
import { BusinessException } from '../src/common/exceptions/business.exception';
import { ConsoleNotificationChannel } from '../src/modules/notification/channels/console.channel';
import { WebhookNotificationChannel } from '../src/modules/notification/channels/webhook.channel';
import { NotificationService } from '../src/modules/notification/notification.service';

describe('ConsoleNotificationChannel', () => {
  it('总是成功并带上 channel/to', async () => {
    const ch = new ConsoleNotificationChannel();
    const res = await ch.send({ to: 'a@b.com', subject: 'hi', content: 'hello' });
    expect(res).toMatchObject({ channel: 'console', to: 'a@b.com', success: true });
  });
});

describe('WebhookNotificationChannel', () => {
  const cfg = (over: Partial<{ url: string; method: string }> = {}) => ({
    url: 'https://hook.example.com/notify',
    method: 'POST',
    headers: { Authorization: 'Bearer x' },
    timeoutMs: 1000,
    ...over,
  });

  afterEach(() => vi.restoreAllMocks());

  it('未配置 url 时返回失败而不抛错', async () => {
    const ch = new WebhookNotificationChannel(cfg({ url: '' }));
    const res = await ch.send({ to: 'a', content: 'c' });
    expect(res.success).toBe(false);
    expect(res.detail).toMatch(/未配置/);
  });

  it('POST JSON 到配置地址, 2xx 视为成功', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(new Response('ok', { status: 200 }));
    const ch = new WebhookNotificationChannel(cfg());
    const res = await ch.send({ to: 'a', subject: 's', content: 'c' });

    expect(res.success).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://hook.example.com/notify');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer x');
    expect(JSON.parse(init?.body as string)).toMatchObject({ to: 'a', content: 'c' });
  });

  it('非 2xx 返回失败并带状态码', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('no', { status: 500 }));
    const ch = new WebhookNotificationChannel(cfg());
    const res = await ch.send({ to: 'a', content: 'c' });
    expect(res.success).toBe(false);
    expect(res.detail).toMatch(/500/);
  });

  it('fetch 抛错时捕获为失败结果', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('boom'));
    const ch = new WebhookNotificationChannel(cfg());
    const res = await ch.send({ to: 'a', content: 'c' });
    expect(res.success).toBe(false);
    expect(res.detail).toBe('boom');
  });
});

describe('NotificationService', () => {
  it('渠道成功时透传结果', async () => {
    const svc = new NotificationService({
      name: 'fake',
      send: async () => ({ channel: 'fake', to: 'a', success: true, id: 'mid' }),
    });
    const res = await svc.send({ to: 'a', content: 'c' });
    expect(res).toMatchObject({ success: true, id: 'mid' });
    expect(svc.driver).toBe('fake');
  });

  it('渠道失败时抛 NOTIFICATION_SEND_FAILED 业务异常', async () => {
    const svc = new NotificationService({
      name: 'fake',
      send: async () => ({ channel: 'fake', to: 'a', success: false, detail: 'nope' }),
    });
    await expect(svc.send({ to: 'a', content: 'c' })).rejects.toMatchObject({
      code: ErrorCode.NOTIFICATION_SEND_FAILED,
    });
    await expect(svc.send({ to: 'a', content: 'c' })).rejects.toBeInstanceOf(BusinessException);
  });
});
