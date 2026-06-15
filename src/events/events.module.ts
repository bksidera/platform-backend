import { Module } from '@nestjs/common';
import { EventsController } from './events.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ResponseService } from 'src/response/response.service';

@Module({
  imports: [PrismaModule],
  controllers: [EventsController],
  providers: [ResponseService],
})
export class EventsModule {}
