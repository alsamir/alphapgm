import { Module } from '@nestjs/common';
import { ImagesService } from './images.service';
import { ImagesController } from './images.controller';
import { WatermarkService } from './watermark.service';

@Module({
  controllers: [ImagesController],
  providers: [ImagesService, WatermarkService],
  exports: [ImagesService],
})
export class ImagesModule {}
