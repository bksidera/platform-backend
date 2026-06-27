import { Module } from '@nestjs/common';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ResponseModule } from 'src/response/response.module';
import { FrameController } from './frame.controller';
import { FrameService } from './frame.service';

@Module({
  imports: [PrismaModule, ResponseModule],
  controllers: [FrameController],
  providers: [FrameService],
})
export class FrameModule {}
