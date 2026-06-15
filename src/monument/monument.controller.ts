import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { MonumentService } from './monument.service';
import { ResponseService } from 'src/response/response.service';
import { CreatorGuard } from 'src/guards/guards.service';
import { CreateInscriptionDto, CreateMonumentDto } from './dto/monument.dto';

@Controller('monument')
export class MonumentController {
  constructor(
    private readonly monumentService: MonumentService,
    private readonly responseService: ResponseService,
  ) {}

  @UseGuards(CreatorGuard)
  @Post()
  async create(@Req() req, @Body() dto: CreateMonumentDto, @Res() res: Response) {
    const monument = await this.monumentService.create(req.user.id, dto);
    return this.responseService.success('success', 'Monument created', monument, res);
  }

  @UseGuards(CreatorGuard)
  @Get('mine')
  async mine(@Req() req, @Res() res: Response) {
    const monuments = await this.monumentService.listMine(req.user.id);
    return this.responseService.success('success', 'OK', { monuments }, res);
  }

  @Post('inscription')
  async placeInscription(@Body() dto: CreateInscriptionDto, @Res() res: Response) {
    const result = await this.monumentService.placeInscription(dto);
    if ('error' in result) {
      return this.responseService.incorrectData(result.error, res);
    }
    return this.responseService.success('success', 'Inscribed', result.inscription, res);
  }

  @Get('inscription/:id')
  async reveal(@Param('id') id: string, @Res() res: Response) {
    const inscription = await this.monumentService.revealInscription(id);
    if (!inscription) {
      return this.responseService.NOT_FOUND('Not found', {}, res);
    }
    return this.responseService.success('success', 'OK', inscription, res);
  }

  @Get(':qrSourceSlug')
  async publicBySlug(@Param('qrSourceSlug') slug: string, @Res() res: Response) {
    const monument = await this.monumentService.publicBySlug(slug);
    if (!monument) {
      return this.responseService.NOT_FOUND('No monument at this address', {}, res);
    }
    return this.responseService.success('success', 'OK', monument, res);
  }
}
