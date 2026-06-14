import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FileObject } from './entities/file-object.entity';
import { storageProviderFactory } from './storage/storage.factory';
import { UploadController } from './upload.controller';
import { UploadService } from './upload.service';

@Module({
  imports: [TypeOrmModule.forFeature([FileObject])],
  controllers: [UploadController],
  providers: [UploadService, storageProviderFactory],
  exports: [UploadService],
})
export class UploadModule {}
