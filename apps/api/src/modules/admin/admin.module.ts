import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ConvertersModule } from '../converters/converters.module';

@Module({
  imports: [ConvertersModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
