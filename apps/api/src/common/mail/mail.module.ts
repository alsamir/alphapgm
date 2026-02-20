import { Module, Global } from '@nestjs/common';
import { MailService } from './mail.service';
import { SettingsModule } from '../../modules/settings/settings.module';

@Global()
@Module({
  imports: [SettingsModule],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
