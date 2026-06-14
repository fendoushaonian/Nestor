import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginatedResult, paginate } from '@nestor/shared';
import { FindOptionsWhere, Repository } from 'typeorm';
import { AuditLog } from './entities/audit-log.entity';

export interface RecordAuditInput {
  userId?: string;
  action: string;
  target?: string;
  detail?: string;
  ip?: string;
  userAgent?: string;
}

export interface QueryAuditInput {
  page: number;
  pageSize: number;
  userId?: string;
  action?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(@InjectRepository(AuditLog) private readonly auditLogs: Repository<AuditLog>) {}

  /** 写审计日志。失败只告警不抛出, 不影响主流程。 */
  async record(input: RecordAuditInput): Promise<void> {
    try {
      await this.auditLogs.save(this.auditLogs.create(input));
    } catch (err) {
      this.logger.warn(`写审计日志失败: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async query(input: QueryAuditInput): Promise<PaginatedResult<AuditLog>> {
    const where: FindOptionsWhere<AuditLog> = {};
    if (input.userId) where.userId = input.userId;
    if (input.action) where.action = input.action;

    const [list, total] = await this.auditLogs.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    });
    return paginate(list, total, input.page, input.pageSize);
  }
}
