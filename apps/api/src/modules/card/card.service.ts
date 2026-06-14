import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { PaginatedResult, paginate } from '@nestor/core';
import { DataSource, Repository } from 'typeorm';
import { generateCardCode, generateCardSecret } from './card-code.util';
import { GenerateCardsDto } from './dto/generate-cards.dto';
import { CardBatch } from './entities/card-batch.entity';
import { Card } from './entities/card.entity';
import { UserEntitlement } from './entities/user-entitlement.entity';
import { ProductService } from './product.service';

const INSERT_CHUNK = 1000;

export interface GeneratedBatch {
  batch: CardBatch;
  cards: Array<{ code: string; secret: string }>;
}

@Injectable()
export class CardService {
  constructor(
    @InjectRepository(Card) private readonly cards: Repository<Card>,
    @InjectRepository(CardBatch) private readonly batches: Repository<CardBatch>,
    @InjectRepository(UserEntitlement)
    private readonly entitlements: Repository<UserEntitlement>,
    private readonly products: ProductService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * 批量生成卡密。整批写在一个事务里:
   * 先建批次, 再分块插入卡密 (避免单条超大 INSERT)。
   * 返回明文卡号/卡密 (仅此一次, 用于分发)。
   */
  async generate(dto: GenerateCardsDto, createdBy?: string): Promise<GeneratedBatch> {
    await this.products.getOrThrow(dto.productId);

    return this.dataSource.transaction(async (manager) => {
      const batch = await manager.save(
        manager.create(CardBatch, {
          name: dto.name,
          productId: dto.productId,
          total: dto.count,
          expireDays: dto.expireDays ?? 0,
          createdBy,
          remark: dto.remark,
        }),
      );

      const plain: Array<{ code: string; secret: string }> = [];
      const seen = new Set<string>();
      while (plain.length < dto.count) {
        const code = generateCardCode();
        if (seen.has(code)) continue;
        seen.add(code);
        plain.push({ code, secret: generateCardSecret() });
      }

      for (let i = 0; i < plain.length; i += INSERT_CHUNK) {
        const slice = plain.slice(i, i + INSERT_CHUNK);
        await manager.insert(
          Card,
          slice.map((c) => ({ batchId: batch.id, code: c.code, secret: c.secret })),
        );
      }

      return { batch, cards: plain };
    });
  }

  async listBatches(page: number, pageSize: number): Promise<PaginatedResult<CardBatch>> {
    const [list, total] = await this.batches.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return paginate(list, total, page, pageSize);
  }

  async listCards(batchId: string, page: number, pageSize: number): Promise<PaginatedResult<Card>> {
    const [list, total] = await this.cards.findAndCount({
      where: { batchId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });
    return paginate(list, total, page, pageSize);
  }

  listEntitlements(userId: string): Promise<UserEntitlement[]> {
    return this.entitlements.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }
}
