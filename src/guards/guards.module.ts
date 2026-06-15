import { Module } from '@nestjs/common';
import { CreatorGuard, JwtAuthGuard } from './guards.service';

@Module({
  providers: [JwtAuthGuard, CreatorGuard],
  exports: [JwtAuthGuard, CreatorGuard],
})
export class GuardsModule {}
