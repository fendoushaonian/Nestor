import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { CredentialService } from './credential.service';
import { CreateCredentialDto } from './dto/create-credential.dto';

@ApiTags('workflow')
@ApiBearerAuth()
@Controller('credentials')
export class CredentialController {
  constructor(private readonly credentials: CredentialService) {}

  @Get()
  @Permissions('workflow:read')
  @ApiOperation({ summary: '凭证列表 (脱敏, 不返回密文)' })
  list() {
    return this.credentials.list();
  }

  @Get(':id')
  @Permissions('workflow:read')
  @ApiOperation({ summary: '凭证详情 (脱敏)' })
  get(@Param('id') id: string) {
    return this.credentials.get(id);
  }

  @Post()
  @Permissions('workflow:write')
  @ApiOperation({ summary: '创建凭证 (明文加密后落库)' })
  create(@Body() dto: CreateCredentialDto, @CurrentUser() user?: AuthUser) {
    return this.credentials.create(dto, user?.id);
  }

  @Delete(':id')
  @Permissions('workflow:write')
  @ApiOperation({ summary: '删除凭证' })
  async remove(@Param('id') id: string) {
    await this.credentials.remove(id);
    return { removed: true };
  }
}
