import { Module } from '@nestjs/common';
import { ConvertersService } from './converters.service';
import { ConvertersController } from './converters.controller';

@Module({
  controllers: [ConvertersController],
  providers: [ConvertersService],
  exports: [ConvertersService],
})
export class ConvertersModule {}
