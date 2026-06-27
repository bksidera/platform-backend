import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CreatorGuard } from 'src/guards/guards.service';
import { ResponseService } from 'src/response/response.service';
import { CardService } from './card.service';
import { CreateCardDto, ReportCardDto } from './dto/card.dto';

@Controller()
export class CardController {
  constructor(
    private readonly cardService: CardService,
    private readonly responseService: ResponseService,
  ) {}

  @Post('frames/:slug/cards')
  async createForFrame(
    @Param('slug') slug: string,
    @Body() dto: CreateCardDto,
    @Res() res: Response,
  ) {
    const result = await this.cardService.createForFrame(slug, dto);
    if ('error' in result) {
      return this.responseService.incorrectData(result.error, res);
    }
    return this.responseService.success('success', 'Card placed', result.card, res);
  }

  @Post('cards/:id/payment-intent')
  async createPaymentIntent(@Param('id') id: string, @Res() res: Response) {
    const result = await this.cardService.createPaymentIntent(id);
    if ('error' in result) {
      return this.responseService.incorrectData(result.error, res);
    }
    return this.responseService.success('success', 'Intent created', result, res);
  }

  @Get('cards/:id/payment-status')
  async paymentStatus(@Param('id') id: string, @Res() res: Response) {
    const result = await this.cardService.paymentStatus(id);
    if (!result) {
      return this.responseService.NOT_FOUND('Card payment not found', {}, res);
    }
    return this.responseService.success('success', 'OK', result, res);
  }

  @Post('cards/:id/report')
  async report(@Param('id') id: string, @Body() dto: ReportCardDto, @Res() res: Response) {
    const result = await this.cardService.report(id, dto);
    return this.responseService.success('success', 'Card reported', result, res);
  }

  @UseGuards(CreatorGuard)
  @Post('cards/:id/hide')
  async hide(@Param('id') id: string, @Req() req, @Res() res: Response) {
    const result = await this.cardService.hide(id, req.user.id);
    if (!result) {
      return this.responseService.NOT_FOUND('Card not found', {}, res);
    }
    return this.responseService.success('success', 'Card hidden', result, res);
  }
}
