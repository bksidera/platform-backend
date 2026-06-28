import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { ConfigService } from '@nestjs/config';
import { paymentSimulationEnabled } from './payment/payment.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly configService: ConfigService,
  ) { }

  @Get("/")
  getHello(): string {
    return this.appService.getHello();
  }
  @Get("/testDev")
  testDev(): string {
    return "Welcome dev";
  }

  @Get("/health")
  health() {
    return {
      status: true,
      message: 'OK',
      data: {
        service: 'platform-backend',
        environment: this.configService.get<string>('NODE_ENV') ?? 'development',
        paymentSimulation: paymentSimulationEnabled(this.configService),
      },
    };
  }
}
