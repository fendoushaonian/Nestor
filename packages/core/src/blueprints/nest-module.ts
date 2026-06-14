import type { Blueprint, GeneratedFile, TemplateVariables } from '../types.js'

/**
 * Files for a full-stack-ready NestJS feature module, modelled on the
 * conventions used by `apps/api` (auth/card/upload): entity extends
 * `BaseEntity`, service uses a TypeORM repository + `paginate`, controller is
 * permission-guarded REST, with create/update DTOs.
 *
 * Generated under `<targetDir>/<kebab>/`. Import paths assume the module lives
 * at `src/modules/<kebab>/` (run `nestor g module <name>` from `apps/api`).
 */
function nestModuleFiles(v: TemplateVariables): GeneratedFile[] {
  const P = v.pascalName
  const kebab = v.kebabName

  const entity = `import { BaseEntity } from '@nestor/shared';
import { Column, Entity } from 'typeorm';

@Entity('${v.tableName}')
export class ${P} extends BaseEntity {
  @Column({ length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;
}
`

  const createDto = `import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class Create${P}Dto {
  @ApiProperty({ description: '名称' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiPropertyOptional({ description: '描述' })
  @IsOptional()
  @IsString()
  description?: string;
}
`

  const updateDto = `import { PartialType } from '@nestjs/swagger';
import { Create${P}Dto } from './create-${kebab}.dto';

export class Update${P}Dto extends PartialType(Create${P}Dto) {}
`

  const service = `import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ErrorCode, PaginatedResult, paginate } from '@nestor/shared';
import { Repository } from 'typeorm';
import { BusinessException } from '../../common/exceptions/business.exception';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Create${P}Dto } from './dto/create-${kebab}.dto';
import { Update${P}Dto } from './dto/update-${kebab}.dto';
import { ${P} } from './entities/${kebab}.entity';

@Injectable()
export class ${P}Service {
  constructor(@InjectRepository(${P}) private readonly repo: Repository<${P}>) {}

  async create(dto: Create${P}Dto): Promise<${P}> {
    return this.repo.save(this.repo.create(dto));
  }

  async list(query: PaginationQueryDto): Promise<PaginatedResult<${P}>> {
    const [rows, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
    });
    return paginate(rows, total, query.page, query.pageSize);
  }

  async findById(id: string): Promise<${P}> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) throw new BusinessException(ErrorCode.NOT_FOUND, '${P} 不存在');
    return entity;
  }

  async update(id: string, dto: Update${P}Dto): Promise<${P}> {
    const entity = await this.findById(id);
    Object.assign(entity, dto);
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findById(id);
    await this.repo.softRemove(entity);
  }
}
`

  const controller = `import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Create${P}Dto } from './dto/create-${kebab}.dto';
import { Update${P}Dto } from './dto/update-${kebab}.dto';
import { ${P}Service } from './${kebab}.service';

@ApiTags('${kebab}')
@ApiBearerAuth()
@Controller('${v.pluralKebab}')
export class ${P}Controller {
  constructor(private readonly service: ${P}Service) {}

  @Post()
  @Permissions('${kebab}:write')
  @ApiOperation({ summary: '创建 ${P}' })
  create(@Body() dto: Create${P}Dto) {
    return this.service.create(dto);
  }

  @Get()
  @Permissions('${kebab}:read')
  @ApiOperation({ summary: '${P} 列表 (分页)' })
  list(@Query() query: PaginationQueryDto) {
    return this.service.list(query);
  }

  @Get(':id')
  @Permissions('${kebab}:read')
  @ApiOperation({ summary: '${P} 详情' })
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.service.findById(id);
  }

  @Patch(':id')
  @Permissions('${kebab}:write')
  @ApiOperation({ summary: '更新 ${P}' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: Update${P}Dto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Permissions('${kebab}:write')
  @ApiOperation({ summary: '删除 ${P}' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.service.remove(id);
    return { id };
  }
}
`

  const moduleFile = `import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ${P} } from './entities/${kebab}.entity';
import { ${P}Controller } from './${kebab}.controller';
import { ${P}Service } from './${kebab}.service';

@Module({
  imports: [TypeOrmModule.forFeature([${P}])],
  controllers: [${P}Controller],
  providers: [${P}Service],
  exports: [${P}Service],
})
export class ${P}Module {}
`

  return [
    { path: `${kebab}/${kebab}.module.ts`, contents: moduleFile },
    { path: `${kebab}/${kebab}.service.ts`, contents: service },
    { path: `${kebab}/${kebab}.controller.ts`, contents: controller },
    { path: `${kebab}/entities/${kebab}.entity.ts`, contents: entity },
    { path: `${kebab}/dto/create-${kebab}.dto.ts`, contents: createDto },
    { path: `${kebab}/dto/update-${kebab}.dto.ts`, contents: updateDto },
  ]
}

/** Build the NestJS backend-module blueprint under a given command name. */
export function nestModuleBlueprint(name: string, description: string): Blueprint {
  return {
    name,
    description,
    targetDir: 'src/modules',
    files: (_entityName, vars) => nestModuleFiles(vars),
  }
}
