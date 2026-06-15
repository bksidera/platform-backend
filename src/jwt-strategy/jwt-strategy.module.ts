import { Module } from '@nestjs/common';
import { JwtStrategy } from './jwt-strategy.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [JwtStrategy],
  exports: [JwtStrategy]
})
export class JwtStrategyModule { }
