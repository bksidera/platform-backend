import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateFrameDto } from './dto/frame.dto';

@Injectable()
export class FrameService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueSlug(title: string) {
    const base =
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 36) || 'frame';

    let slug = `${base}-${randomBytes(3).toString('hex')}`;
    while (await this.prisma.frame.findUnique({ where: { slug } })) {
      slug = `${base}-${randomBytes(3).toString('hex')}`;
    }
    return slug;
  }

  async create(creatorId: string, dto: CreateFrameDto) {
    return this.prisma.frame.create({
      data: {
        creatorId,
        title: dto.title.trim(),
        context: dto.context?.trim() || null,
        imageUrl: dto.imageUrl,
        slug: await this.uniqueSlug(dto.title),
      },
    });
  }

  async listMine(creatorId: string) {
    const frames = await this.prisma.frame.findMany({
      where: { creatorId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { cards: true } },
        cards: {
          where: { reportedAt: null },
          select: {
            amountCents: true,
            paymentStatus: true,
            photoUrl: true,
            photoModerationStatus: true,
            hiddenByCreator: true,
            visibility: true,
          },
        },
      },
    });
    return frames.map(({ _count, cards, ...frame }) => ({
      ...frame,
      cardCount: _count.cards,
      visibleCardCount: cards.filter((card) => !card.hiddenByCreator).length,
      amountReceivedCents: cards.reduce(
        (total, card) =>
          card.paymentStatus === 'succeeded' ? total + (card.amountCents ?? 0) : total,
        0,
      ),
      amountPendingCents: cards.reduce(
        (total, card) =>
          card.amountCents && card.paymentStatus !== 'succeeded'
            ? total + card.amountCents
            : total,
        0,
      ),
      heldPhotoCount: cards.filter(
        (card) => card.photoUrl && card.photoModerationStatus !== 'approved',
      ).length,
    }));
  }

  async publicBySlug(slug: string) {
    const frame = await this.prisma.frame.findUnique({
      where: { slug },
      include: {
        creator: { select: { name: true, slug: true } },
        cards: {
          where: { hiddenByCreator: false, reportedAt: null, visibility: 'public' },
          orderBy: { createdAt: 'asc' },
          select: {
            id: true,
            displayName: true,
            note: true,
            photoUrl: true,
            photoModerationStatus: true,
            amountCents: true,
            currency: true,
            paymentStatus: true,
            visibility: true,
            createdAt: true,
          },
        },
      },
    });
    if (!frame || frame.status !== 'active') return null;

    return {
      id: frame.id,
      title: frame.title,
      context: frame.context,
      imageUrl: frame.imageUrl,
      slug: frame.slug,
      creator: frame.creator,
      cards: frame.cards.map((card) => ({
        id: card.id,
        displayName: card.displayName,
        note: card.note,
        photoUrl: card.photoModerationStatus === 'approved' ? card.photoUrl : null,
        amountCents: null,
        currency: card.currency,
        hasAmount: Boolean(card.amountCents && card.paymentStatus === 'succeeded'),
        paymentStatus: card.paymentStatus,
        visibility: card.visibility,
        createdAt: card.createdAt,
      })),
      cardCount: frame.cards.length,
    };
  }

  async creatorBySlug(creatorId: string, slug: string) {
    const frame = await this.prisma.frame.findFirst({
      where: { slug, creatorId },
      include: {
        creator: { select: { name: true, slug: true } },
        cards: {
          where: { reportedAt: null },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            displayName: true,
            email: true,
            note: true,
            photoUrl: true,
            photoModerationStatus: true,
            amountCents: true,
            currency: true,
            paymentStatus: true,
            visibility: true,
            hiddenByCreator: true,
            createdAt: true,
          },
        },
      },
    });
    if (!frame || frame.status !== 'active') return null;

    return {
      id: frame.id,
      title: frame.title,
      context: frame.context,
      imageUrl: frame.imageUrl,
      slug: frame.slug,
      creator: frame.creator,
      cards: frame.cards.map((card) => ({
        id: card.id,
        displayName: card.displayName,
        email: card.email,
        note: card.note,
        photoUrl: card.photoUrl,
        photoModerationStatus: card.photoModerationStatus,
        amountCents: card.amountCents,
        currency: card.currency,
        hasAmount: Boolean(card.amountCents && card.paymentStatus === 'succeeded'),
        paymentStatus: card.paymentStatus,
        visibility: card.visibility,
        hiddenByCreator: card.hiddenByCreator,
        createdAt: card.createdAt,
      })),
      cardCount: frame.cards.length,
    };
  }
}
