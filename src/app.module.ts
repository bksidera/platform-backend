import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MulterModule } from '@nestjs/platform-express';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CreatorModule } from './creator/creator.module';
import { PaymentModule } from './payment/payment.module';
import { EventsModule } from './events/events.module';
import { MonumentModule } from './monument/monument.module';
import { FrameModule } from './frame/frame.module';
import { CardModule } from './card/card.module';
import { StripeModule } from './stripe/stripe.module';
import { GuardsModule } from './guards/guards.module';
import { ResponseModule } from './response/response.module';
import { JwtStrategyModule } from './jwt-strategy/jwt-strategy.module';
import { CorsMiddlewareModule } from './cors-middleware/cors-middleware.module';
import { CorsMiddlewareService } from './cors-middleware/cors-middleware.service';
import { MailModule } from './mail/mail.module';
import { CommonModule } from './common/common.module';
import { LoggerModule } from './logger/logger.module';
import { FileUploadModule } from './file-upload/file-upload.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    StripeModule,
    AuthModule,
    CreatorModule,
    PaymentModule,
    EventsModule,
    MonumentModule,
    FrameModule,
    CardModule,
    GuardsModule,
    ResponseModule,
    JwtStrategyModule,
    CorsMiddlewareModule,
    MailModule,
    CommonModule,
    LoggerModule,
    FileUploadModule,
    MulterModule.register({ dest: './uploads' }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(CorsMiddlewareService)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
