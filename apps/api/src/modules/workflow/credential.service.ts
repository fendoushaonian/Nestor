import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@nestor/core';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { Configuration } from '../../config/configuration';
import { decryptJson, encryptJson } from './crypto.util';
import { CreateCredentialDto } from './dto/create-credential.dto';
import { Credential } from './entities/credential.entity';

/** 凭证的脱敏视图 (不含密文) */
export interface SafeCredential {
  id: string;
  name: string;
  type: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class CredentialService {
  private readonly key: string;

  constructor(
    @InjectRepository(Credential) private readonly credentials: Repository<Credential>,
    config: ConfigService<Configuration, true>,
  ) {
    this.key = config.get('workflow', { infer: true }).encryptionKey;
  }

  private toSafe(c: Credential): SafeCredential {
    return { id: c.id, name: c.name, type: c.type, createdAt: c.createdAt, updatedAt: c.updatedAt };
  }

  async create(dto: CreateCredentialDto, userId?: string): Promise<SafeCredential> {
    const credential = this.credentials.create({
      name: dto.name,
      type: dto.type,
      dataEncrypted: encryptJson(dto.data, this.key),
      createdBy: userId,
    });
    return this.toSafe(await this.credentials.save(credential));
  }

  async list(): Promise<SafeCredential[]> {
    const list = await this.credentials.find({ order: { createdAt: 'DESC' } });
    return list.map((c) => this.toSafe(c));
  }

  async get(id: string): Promise<SafeCredential> {
    return this.toSafe(await this.getEntity(id));
  }

  async remove(id: string): Promise<void> {
    const credential = await this.getEntity(id);
    await this.credentials.remove(credential);
  }

  /** 给引擎用: 解密出明文凭证数据 */
  async getDecrypted(id: string): Promise<Record<string, unknown> | undefined> {
    const credential = await this.credentials.findOne({ where: { id } });
    if (!credential) return undefined;
    return decryptJson(credential.dataEncrypted, this.key);
  }

  private async getEntity(id: string): Promise<Credential> {
    const credential = await this.credentials.findOne({ where: { id } });
    if (!credential) {
      throw new BusinessException(ErrorCode.CREDENTIAL_NOT_FOUND, `凭证 ${id} 不存在`);
    }
    return credential;
  }
}
