import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { IsIn, IsObject, IsOptional, IsString } from 'class-validator';
import { PrismaService } from 'src/prisma/prisma.service';
import { ResponseService } from 'src/response/response.service';

// Client-reported events only; money-truth events (checkout_complete, claim,
// countersign) are written server-side where they happen.
const CLIENT_EVENT_TYPES = [
  'qr_scan',
  'monument_view',
  'observation_attached',
  'photo_attached',
  'graduation_view',
  'graduation_accept',
] as const;

export class TrackEventDto {
  @IsIn(CLIENT_EVENT_TYPES as readonly string[])
  type: string;

  @IsOptional()
  @IsString()
  sourceSlug?: string;

  @IsOptional()
  @IsString()
  monumentId?: string;

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
        monumentId: dto.monumentId ?? null,
        creatorId: dto.creatorId ?? null,
        metadata: (dto.metadata as object) ?? undefined,
      },
    });
    return this.responseService.success('success', 'OK', {}, res);
  }
}
