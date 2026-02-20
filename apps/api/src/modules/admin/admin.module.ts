import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { ConvertersModule } from '../converters/converters.module';
import { MailModule } from '../../common/mail/mail.module';

@Module({
  imports: [ConvertersModule, MailModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
