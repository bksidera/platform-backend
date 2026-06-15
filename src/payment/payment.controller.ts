import { Body, Controller, Get, Headers, Post, Query, RawBodyRequest, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { PaymentService } from './payment.service';
import { ResponseService } from 'src/response/response.service';
import { LoggerService } from 'src/logger/logger.service';
import { CreateMomentIntentDto } from './dto/payment.dto';

@Controller('payment')
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly responseService: ResponseService,
    private readonly logger: LoggerService,
  ) {}

  // Public — guest checkout happens before any account exists.
  @Post('createMomentIntent')
  async createMomentIntent(@Body() dto: CreateMomentIntentDto, @Res() res: Response) {
    const result = await this.paymentService.createMomentIntent(dto);
    if ('error' in result) {
      return this.responseService.incorrectData(result.error, res);
    }
    return this.responseService.success('success', 'Intent created', result, res);
  }

  @Get('streamStatus')
  async streamStatus(@Query('streamId') streamId: string, @Res() res: Response) {
    const result = await this.paymentService.streamStatus(streamId);
    if (!result) {
      return this.responseService.NOT_FOUND('Stream not found', {}, res);
    }
    return this.responseService.success('success', 'OK', result, res);
  }

  @Post('webhook')
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.paymentService.handleWebhook(req.rawBody, signature);
      return res.status(200).json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Webhook rejected: ${message}`);
      return res.status(400).json({ error: 'invalid signature' });
    }
  }
}
