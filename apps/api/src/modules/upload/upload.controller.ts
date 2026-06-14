import {
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { Response } from 'express';
import { AuthUser } from '../auth/auth.types';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { SkipTransform } from '../../common/decorators/skip-transform.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { UploadFile, UploadService } from './upload.service';

@ApiTags('upload')
@ApiBearerAuth()
@Controller()
export class UploadController {
  constructor(private readonly upload: UploadService) {}

  @Post('upload')
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: '上传文件 (multipart/form-data, 字段名 file)' })
  @ApiBody({
    schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } },
  })
  uploadFile(@UploadedFile() file: UploadFile | undefined, @CurrentUser() user?: AuthUser) {
    return this.upload.upload(file, user?.id);
  }

  @Get('files')
  @Permissions('file:read')
  @ApiOperation({ summary: '文件列表 (需 file:read 权限)' })
  list(@Query() query: PaginationQueryDto) {
    return this.upload.list(query);
  }

  @Delete('files/:id')
  @Permissions('file:write')
  @ApiOperation({ summary: '删除文件 (需 file:write 权限)' })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    await this.upload.remove(id);
    return { id };
  }

  @Get('files/:id/raw')
  @Public()
  @SkipTransform()
  @ApiOperation({ summary: '下载/回源文件: 本地驱动直接读取, 远端驱动 302 跳转到对象 URL' })
  async raw(@Param('id', ParseUUIDPipe) id: string, @Res() res: Response): Promise<void> {
    const file = await this.upload.findById(id);
    const content = await this.upload.readContent(file);
    if (content) {
      res.setHeader('Content-Type', file.mimeType);
      res.setHeader('Content-Length', String(file.size));
      res.send(content);
      return;
    }
    res.redirect(302, file.url);
  }
}
