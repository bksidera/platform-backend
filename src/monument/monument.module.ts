import { Module } from '@nestjs/common';
import { MonumentController } from './monument.controller';
import { MonumentService } from './monument.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ResponseService } from 'src/response/response.service';

@Module({
  imports: [PrismaModule],
  controllers: [MonumentController],
  providers: [MonumentService, ResponseService],
})
export class MonumentModule {}
