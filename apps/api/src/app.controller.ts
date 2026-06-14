import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './modules/auth/decorators/public.decorator';

@ApiTags('app')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: '服务信息' })
  info() {
    return {
      name: 'Nestor',
      description: '企业级 APP 快速开发脚手架',
      version: process.env.npm_package_version ?? '0.1.0',
    };
  }
}
