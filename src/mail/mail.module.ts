import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ConfigModule } from '@nestjs/config';

@Module({
  providers: [MailService],
  exports: [MailService],
  imports: [ConfigModule]
})
export class MailModule { }
