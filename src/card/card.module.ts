import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ResponseModule } from 'src/response/response.module';
import { StripeModule } from 'src/stripe/stripe.module';
import { CardController } from './card.controller';
import { CardService } from './card.service';

@Module({
  imports: [PrismaModule, ResponseModule, StripeModule],
  controllers: [CardController],
  providers: [CardService],
})
export class CardModule {}
