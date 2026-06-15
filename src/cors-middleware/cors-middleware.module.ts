import { Module } from '@nestjs/common';
import { CorsMiddlewareService } from './cors-middleware.service';

@Module({
  providers: [CorsMiddlewareService],
  exports: [CorsMiddlewareModule]
})
export class CorsMiddlewareModule { }
