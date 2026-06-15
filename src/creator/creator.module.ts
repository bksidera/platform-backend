import { Module } from '@nestjs/common';
import { CreatorController } from './creator.controller';
import { CreatorService } from './creator.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ResponseService } from 'src/response/response.service';

@Module({
  imports: [PrismaModule],
  controllers: [CreatorController],
  providers: [CreatorService, ResponseService],
  exports: [CreatorService],
})
export class CreatorModule {}
