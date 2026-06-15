import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';

const port = process.env.PORT || 3000;

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true, bodyParser: true });

  app.enableCors({
    allowedHeaders: '*',
    origin: '*',
  });
  app.setGlobalPrefix('backend-api');

  // Stripe webhook signature verification needs the raw body.
  app.use('/backend-api/payment/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));

  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          property: error.property,
          message: error.constraints[Object.keys(error.constraints)[0]],
        }));
        return new HttpException(
          { status: false, message: 'Validation failed', data: result },
          HttpStatus.OK,
        );
      },
      stopAtFirstError: true,
    }),
  );

  await app.listen(port);
  console.log('Server started at', port);
}
bootstrap();
