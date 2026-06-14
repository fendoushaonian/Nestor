import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode } from '@nestor/shared';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { CreateProductDto } from './dto/create-product.dto';
import { Product } from './entities/product.entity';

@Injectable()
export class ProductService {
  constructor(@InjectRepository(Product) private readonly products: Repository<Product>) {}

  create(dto: CreateProductDto): Promise<Product> {
    return this.products.save(
      this.products.create({
        name: dto.name,
        type: dto.type,
        durationDays: dto.durationDays ?? 0,
        quota: dto.quota ?? 0,
        description: dto.description,
      }),
    );
  }

  list(): Promise<Product[]> {
    return this.products.find({ order: { createdAt: 'DESC' } });
  }

  async getOrThrow(id: string): Promise<Product> {
    const product = await this.products.findOne({ where: { id } });
    if (!product) {
      throw new BusinessException(ErrorCode.PRODUCT_NOT_FOUND, '商品不存在');
    }
    return product;
  }
}
