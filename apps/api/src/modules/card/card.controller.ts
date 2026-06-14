import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CardService } from './card.service';
import { CreateProductDto } from './dto/create-product.dto';
import { GenerateCardsDto } from './dto/generate-cards.dto';
import { RedeemCardDto } from './dto/redeem-card.dto';
import { ProductService } from './product.service';
import { RedeemService } from './redeem.service';

@ApiTags('card')
@ApiBearerAuth()
@Controller()
export class CardController {
  constructor(
    private readonly products: ProductService,
    private readonly cards: CardService,
    private readonly redeemSvc: RedeemService,
  ) {}

  @Post('products')
  @Permissions('product:write')
  @ApiOperation({ summary: '创建商品 (权益模板)' })
  createProduct(@Body() dto: CreateProductDto) {
    return this.products.create(dto);
  }

  @Get('products')
  @Permissions('product:read')
  @ApiOperation({ summary: '商品列表' })
  listProducts() {
    return this.products.list();
  }

  @Post('cards/batches')
  @Permissions('card:create')
  @ApiOperation({ summary: '批量生成卡密 (返回明文卡号/卡密, 仅此一次)' })
  generate(@Body() dto: GenerateCardsDto, @CurrentUser() user: AuthUser) {
    return this.cards.generate(dto, user.id);
  }

  @Get('cards/batches')
  @Permissions('card:read')
  @ApiOperation({ summary: '卡密批次列表' })
  listBatches(@Query() q: PaginationQueryDto) {
    return this.cards.listBatches(q.page, q.pageSize);
  }

  @Get('cards/batches/:id/cards')
  @Permissions('card:read')
  @ApiOperation({ summary: '某批次下的卡密列表' })
  listCards(@Param('id', ParseUUIDPipe) id: string, @Query() q: PaginationQueryDto) {
    return this.cards.listCards(id, q.page, q.pageSize);
  }

  @Post('cards/redeem')
  @Permissions('card:redeem')
  @ApiOperation({ summary: '兑换卡密 (事务 + 防并发, 成功发放权益)' })
  redeem(@Body() dto: RedeemCardDto, @CurrentUser() user: AuthUser, @Req() req: Request) {
    return this.redeemSvc.redeem(dto.code, dto.secret, user.id, {
      ip: req.ip,
      device: req.headers['user-agent'],
    });
  }

  @Get('entitlements/me')
  @ApiOperation({ summary: '我的权益列表' })
  myEntitlements(@CurrentUser() user: AuthUser) {
    return this.cards.listEntitlements(user.id);
  }
}
