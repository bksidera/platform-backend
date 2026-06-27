import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseService } from 'src/response/response.service';

// Client-reported events only; money-truth events (checkout_complete, claim,
// countersign) are written server-side where they happen.
const CLIENT_EVENT_TYPES = [
  'qr_scan',
  'frame_view',
  'card_started',
  'card_opened',
  'photo_attached',
] as const;

export class TrackEventDto {
  @IsIn(CLIENT_EVENT_TYPES as readonly string[])
  type: string;

  @IsOptional()
  @IsString()
  sourceSlug?: string;

  @IsOptional()
  @IsString()
  frameId?: string;

  @IsOptional()
  @IsString()
  cardId?: string;

  @IsOptional()
  @IsString()
  creatorId?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

@Controller('events')
export class EventsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly responseService: ResponseService,
  ) {}

  @Post('track')
  async track(@Body() dto: TrackEventDto, @Res() res: Response) {
    await this.prisma.event.create({
      data: {
        type: dto.type,
        sourceSlug: dto.sourceSlug ?? null,
        frameId: dto.frameId ?? null,
        cardId: dto.cardId ?? null,
        creatorId: dto.creatorId ?? null,
        metadata: (dto.metadata as object) ?? undefined,
      },
    });
    return this.responseService.success('success', 'OK', {}, res);
  }
}
