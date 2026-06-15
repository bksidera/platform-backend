import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateInscriptionDto, CreateMonumentDto } from './dto/monument.dto';

@Injectable()
export class MonumentService {
  constructor(private readonly prisma: PrismaService) {}

  async create(creatorId: string, dto: CreateMonumentDto) {
    const base = dto.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 32);
    const qrSourceSlug = `${base}-${randomBytes(3).toString('hex')}`;

    return this.prisma.monument.create({
      data: {
        creatorId,
        title: dto.title,
        venue: dto.venue,
        eventDate: new Date(dto.eventDate),
        imageUrl: dto.imageUrl,
        qrSourceSlug,
      },
    });
  }

  async listMine(creatorId: string) {
    const monuments = await this.prisma.monument.findMany({
      where: { creatorId },
      orderBy: { eventDate: 'desc' },
      include: { _count: { select: { inscriptions: true } } },
    });
    return monuments.map(({ _count, ...m }) => ({ ...m, inscriptionCount: _count.inscriptions }));
  }

  // The Monument at rest: the work, quiet marks, an aggregate count. Names
  // and contents only appear when a pin is opened (two-key checked there).
  async publicBySlug(qrSourceSlug: string) {
    const monument = await this.prisma.monument.findUnique({
      where: { qrSourceSlug },
      include: {
        creator: { select: { name: true, slug: true } },
        inscriptions: {
          where: { hiddenByCreator: false },
          select: { id: true, x: true, y: true, glyph: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!monument) return null;

    return {
      id: monument.id,
      title: monument.title,
      venue: monument.venue,
      eventDate: monument.eventDate,
      imageUrl: monument.imageUrl,
      qrSourceSlug: monument.qrSourceSlug,
      creator: monument.creator,
      inscriptions: monument.inscriptions,
      inscriptionCount: monument.inscriptions.length,
    };
  }

  // Tap-to-reveal. Two-key visibility resolved here and only here.
  async revealInscription(inscriptionId: string) {
    const inscription = await this.prisma.inscription.findUnique({
      where: { id: inscriptionId },
      include: {
        giver: { select: { name: true } },
        stream: { select: { venueStamp: true } },
        monument: { include: { creator: { select: { archiveVisibility: true } } } },
        countersignature: { select: { createdAt: true } },
      },
    });
    if (!inscription || inscription.hiddenByCreator) return null;

    const bothKeys =
      inscription.visibility === 'public' &&
      inscription.monument.creator.archiveVisibility === 'show_opted_in';

    return {
      id: inscription.id,
      glyph: inscription.glyph,
      giverName: bothKeys ? inscription.giver.name : null,
      observationText: inscription.observationText,
      venueStamp: inscription.stream.venueStamp,
      createdAt: inscription.createdAt,
      countersignedAt: inscription.countersignature?.createdAt ?? null,
    };
  }

  // THE PAYMENT GATE (spec L2): an Inscription exists only against a
  // completed Stream, exactly one per Stream — checked here and enforced by
  // the schema's NOT NULL + UNIQUE on streamId.
  async placeInscription(dto: CreateInscriptionDto) {
    const stream = await this.prisma.stream.findUnique({
      where: { id: dto.streamId },
      include: { inscription: { select: { id: true } } },
    });

    if (!stream) return { error: 'STREAM_NOT_FOUND' as const };
    if (stream.status !== 'succeeded') return { error: 'STREAM_NOT_COMPLETED' as const };
    if (!stream.monumentId) return { error: 'STREAM_HAS_NO_MONUMENT' as const };
    if (stream.inscription) return { error: 'STREAM_ALREADY_INSCRIBED' as const };

    const inscription = await this.prisma.inscription.create({
      data: {
        streamId: stream.id,
        giverId: stream.giverId,
        monumentId: stream.monumentId,
        x: dto.x,
        y: dto.y,
        glyph: dto.glyph,
        observationText: dto.observationText ?? null,
        visibility: dto.visibility ?? 'private',
      },
    });

    await this.prisma.event.create({
      data: {
        type: 'pin_placed',
        creatorId: stream.creatorId,
        monumentId: stream.monumentId,
        giverId: stream.giverId,
        metadata: dto.observationText ? { observation: true } : undefined,
      },
    });

    return { inscription };
  }
}
