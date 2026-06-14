import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CardController } from './card.controller';
import { CardService } from './card.service';
import { CardBatch } from './entities/card-batch.entity';
import { CardRedeemLog } from './entities/card-redeem-log.entity';
import { Card } from './entities/card.entity';
import { Product } from './entities/product.entity';
import { UserEntitlement } from './entities/user-entitlement.entity';
import { ProductService } from './product.service';
import { RedeemService } from './redeem.service';

@Module({
  imports: [TypeOrmModule.forFeature([Product, CardBatch, Card, CardRedeemLog, UserEntitlement])],
  controllers: [CardController],
  providers: [ProductService, CardService, RedeemService],
})
export class CardModule {}
