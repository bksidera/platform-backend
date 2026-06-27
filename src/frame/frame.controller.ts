import { Body, Controller, Get, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CreatorGuard } from 'src/guards/guards.service';
import { ResponseService } from 'src/response/response.service';
import { CreateFrameDto } from './dto/frame.dto';
import { FrameService } from './frame.service';

@Controller('frames')
export class FrameController {
  constructor(
    private readonly frameService: FrameService,
    private readonly responseService: ResponseService,
  ) {}

  @UseGuards(CreatorGuard)
  @Post()
  async create(@Req() req, @Body() dto: CreateFrameDto, @Res() res: Response) {
    const frame = await this.frameService.create(req.user.id, dto);
    return this.responseService.success('success', 'Frame created', frame, res);
  }

  @UseGuards(CreatorGuard)
  @Get('mine')
  async mine(@Req() req, @Res() res: Response) {
    const frames = await this.frameService.listMine(req.user.id);
    return this.responseService.success('success', 'OK', { frames }, res);
  }

  @Get(':slug')
  async publicBySlug(@Param('slug') slug: string, @Res() res: Response) {
    const frame = await this.frameService.publicBySlug(slug);
    if (!frame) {
      return this.responseService.NOT_FOUND('No frame at this address', {}, res);
    }
    return this.responseService.success('success', 'OK', frame, res);
  }
}
