import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Configuration } from '../../config/configuration';
import { FileObject } from './entities/file-object.entity';
import { storageProviderFactory } from './storage/storage.factory';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileObject]),
    // multer 在缓冲请求体时即按 maxFileSize 截断, 超限直接 413, 避免大文件撑爆内存。
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<Configuration, true>) => ({
        limits: { fileSize: config.get('storage', { infer: true }).maxFileSize },
      }),
    }),
  ],
  controllers: [UploadController],
  providers: [UploadService, storageProviderFactory],
  exports: [UploadService],
})
export class UploadModule {}
