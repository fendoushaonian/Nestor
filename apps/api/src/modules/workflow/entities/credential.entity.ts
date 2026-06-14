import { BaseEntity } from '@nestor/shared';
import { Column, Entity, Index } from 'typeorm';

/**
 * 连接凭证 (API key / bearer token / basic auth 等)。
 * data 字段是 AES-256-GCM 加密后的密文, 明文不落库。
 */
@Entity('credentials')
export class Credential extends BaseEntity {
  @Column({ length: 128 })
  name!: string;

  /** 凭证类型, 决定节点如何使用 (如 httpHeaderAuth / httpBasicAuth / httpQueryAuth) */
  @Index()
  @Column({ length: 64 })
  type!: string;

  /** 加密后的凭证数据 (base64: iv.tag.ciphertext) */
  @Column({ name: 'data_encrypted', type: 'text' })
  dataEncrypted!: string;

  @Column({ name: 'created_by', type: 'uuid', nullable: true })
  createdBy?: string;
}
