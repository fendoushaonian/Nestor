import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@nestor/core';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { UpsertConfigDto } from './dto/upsert-config.dto';
import { Config } from './entities/config.entity';

@Injectable()
export class ConfigService {
  constructor(@InjectRepository(Config) private readonly configs: Repository<Config>) {}

  list(group?: string): Promise<Config[]> {
    return this.configs.find({
      where: group ? { group } : {},
      order: { group: 'ASC', key: 'ASC' },
    });
  }

  async get(key: string): Promise<Config> {
    const config = await this.configs.findOne({ where: { key } });
    if (!config) {
      throw new BusinessException(ErrorCode.CONFIG_NOT_FOUND, `配置项 ${key} 不存在`);
    }
    return config;
  }

  /** 按 key 新增或更新配置 (幂等)。 */
  async upsert(key: string, dto: UpsertConfigDto): Promise<Config> {
    const existing = await this.configs.findOne({ where: { key } });
    const config = existing ?? this.configs.create({ key });
    config.value = dto.value;
    if (dto.group !== undefined) config.group = dto.group;
    if (dto.description !== undefined) config.description = dto.description;
    return this.configs.save(config);
  }

  async remove(key: string): Promise<void> {
    const config = await this.get(key);
    await this.configs.remove(config);
  }
}
