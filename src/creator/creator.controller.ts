import { Body, Controller, Get, Param, Post, Put, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { CreatorService } from './creator.service';
import { ResponseService } from 'src/response/response.service';
import { CreatorGuard } from 'src/guards/guards.service';
import { UpdateArchiveDto } from './dto/creator.dto';

@Controller('creator')
export class CreatorController {
  constructor(
    private readonly creatorService: CreatorService,
    private readonly responseService: ResponseService,
  ) {}

  @UseGuards(CreatorGuard)
  @Post('onboarding/start')
  async startOnboarding(@Req() req, @Res() res: Response) {
    const result = await this.creatorService.startOnboarding(req.user.id);
    return this.responseService.success('success', 'Onboarding link created', result, res);
  }

  @UseGuards(CreatorGuard)
  @Get('onboarding/status')
  async onboardingStatus(@Req() req, @Res() res: Response) {
    const result = await this.creatorService.onboardingStatus(req.user.id);
    return this.responseService.success('success', 'OK', result, res);
  }

  @UseGuards(CreatorGuard)
  @Put('archive')
  async updateArchive(@Req() req, @Body() dto: UpdateArchiveDto, @Res() res: Response) {
    const result = await this.creatorService.updateArchive(req.user.id, dto);
    return this.responseService.success('success', 'Archive updated', result, res);
  }

  @Get('archive/:slug')
  async publicArchive(@Param('slug') slug: string, @Res() res: Response) {
    const result = await this.creatorService.publicArchive(slug);
    if (!result) {
      return this.responseService.NOT_FOUND('No archive at this address', {}, res);
    }
    return this.responseService.success('success', 'OK', result, res);
  }
}
