import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginatedResult, paginate } from '@nestor/core';
import { FindOptionsWhere, Repository } from 'typeorm';
import { LoginLog } from './entities/login-log.entity';

export interface QueryLoginInput {
  page: number;
  pageSize: number;
  username?: string;
  success?: boolean;
}

@Injectable()
export class LoginLogService {
  constructor(@InjectRepository(LoginLog) private readonly loginLogs: Repository<LoginLog>) {}

  async query(input: QueryLoginInput): Promise<PaginatedResult<LoginLog>> {
    const where: FindOptionsWhere<LoginLog> = {};
    if (input.username) where.username = input.username;
    if (input.success !== undefined) where.success = input.success;

    const [list, total] = await this.loginLogs.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (input.page - 1) * input.pageSize,
      take: input.pageSize,
    });
    return paginate(list, total, input.page, input.pageSize);
  }
}
