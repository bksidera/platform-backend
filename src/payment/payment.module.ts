import { Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ResponseService } from 'src/response/response.service';
import { LoggerModule } from 'src/logger/logger.module';

@Module({
  imports: [PrismaModule, LoggerModule],
  controllers: [PaymentController],
  providers: [PaymentService, ResponseService],
  exports: [PaymentService],
})
export class PaymentModule {}
