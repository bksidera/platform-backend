import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { paymentSimulationEnabled } from 'src/payment/payment.service';
import { StripeService } from 'src/stripe/stripe.service';
import { CreateCardDto, ReportCardDto } from './dto/card.dto';

@Injectable()
export class CardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly configService: ConfigService,
  ) {}

  private get simulation() {
    return paymentSimulationEnabled(this.configService);
  }

  private publicCard(card) {
    return {
      id: card.id,
      displayName: card.displayName,
      note: card.note,
      photoUrl: card.photoModerationStatus === 'approved' ? card.photoUrl : null,
      amountCents: card.amountCents,
      currency: card.currency,
      hasAmount: Boolean(card.amountCents && card.paymentStatus === 'succeeded'),
      paymentStatus: card.paymentStatus,
      visibility: card.visibility,
      createdAt: card.createdAt,
    };
  }

  async createForFrame(slug: string, dto: CreateCardDto) {
    const frame = await this.prisma.frame.findUnique({
      where: { slug },
      include: { creator: true },
    });
    if (!frame || frame.status !== 'active') return { error: 'FRAME_NOT_FOUND' as const };

    const email = dto.email.toLowerCase().trim();
    const giver = await this.prisma.giver.upsert({
      where: { email },
      create: { email, name: dto.displayName.trim() },
      update: { name: dto.displayName.trim() },
    });

    const amountCents = dto.amountCents ?? null;
    const card = await this.prisma.card.create({
      data: {
        frameId: frame.id,
        creatorId: frame.creatorId,
        giverId: giver.id,
        displayName: dto.displayName.trim(),
        email,
        note: dto.note?.trim() || null,
        photoUrl: dto.photoUrl ?? null,
        photoModerationStatus: dto.photoUrl ? 'pending' : null,
        amountCents,
        paymentStatus: 'none',
      },
    });

    await this.prisma.event.create({
      data: {
        type: 'card_placed',
        sourceSlug: slug,
        creatorId: frame.creatorId,
        frameId: frame.id,
        cardId: card.id,
        giverId: giver.id,
        metadata: {
          hasAmount: Boolean(amountCents),
          hasPhoto: Boolean(dto.photoUrl),
          hasNote: Boolean(dto.note?.trim()),
        },
      },
    });

    return { card: this.publicCard(card) };
  }

  async createPaymentIntent(cardId: string) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { creator: true, giver: true, stream: true, frame: true },
    });
    if (!card || card.hiddenByCreator || card.reportedAt) return { error: 'CARD_NOT_FOUND' as const };
    if (!card.amountCents || card.amountCents < 100) return { error: 'CARD_HAS_NO_AMOUNT' as const };
    if (!this.simulation && (!card.creator.stripeAccountId || !card.creator.stripeOnboarded)) {
      return { error: 'CREATOR_NOT_ONBOARDED' as const };
    }

    let stream = card.stream;
    if (!stream) {
      stream = await this.prisma.stream.create({
        data: {
          giverId: card.giverId,
          creatorId: card.creatorId,
          type: 'moment',
          amountCents: card.amountCents,
          venueStamp: card.frame.context,
        },
      });
      await this.prisma.card.update({
        where: { id: card.id },
        data: { streamId: stream.id, paymentStatus: 'pending' },
      });
    }

    let clientSecret: string | null = null;
    if (stream.stripePaymentIntentId) {
      if (this.simulation && stream.stripePaymentIntentId.startsWith('sim_')) {
        clientSecret = `sim_secret_${stream.id}`;
      } else {
        const intent = await this.stripe.client.paymentIntents.retrieve(stream.stripePaymentIntentId);
        clientSecret = intent.client_secret;
      }
    } else if (this.simulation) {
      const simId = `sim_${randomUUID()}`;
      clientSecret = `sim_secret_${stream.id}`;
      await this.prisma.stream.update({
        where: { id: stream.id },
        data: { stripePaymentIntentId: simId },
      });
    } else {
      const intent = await this.stripe.client.paymentIntents.create({
        amount: card.amountCents,
        currency: card.currency,
        automatic_payment_methods: { enabled: true },
        transfer_data: { destination: card.creator.stripeAccountId },
        metadata: { streamId: stream.id, cardId: card.id },
        receipt_email: card.email,
      });
      clientSecret = intent.client_secret;
      await this.prisma.stream.update({
        where: { id: stream.id },
        data: { stripePaymentIntentId: intent.id },
      });
    }

    await this.prisma.event.create({
      data: {
        type: 'amount_started',
        sourceSlug: card.frame.slug,
        creatorId: card.creatorId,
        frameId: card.frameId,
        cardId: card.id,
        giverId: card.giverId,
        metadata: { amountCents: card.amountCents },
      },
    });

    return { cardId: card.id, streamId: stream.id, clientSecret };
  }

  async paymentStatus(cardId: string) {
    const card = await this.prisma.card.findUnique({
      where: { id: cardId },
      include: { stream: true, frame: true },
    });
    if (!card) return null;
    if (!card.stream) return { id: card.id, status: card.paymentStatus };

    if (card.stream.status === 'pending' && card.stream.stripePaymentIntentId) {
      if (this.simulation && card.stream.stripePaymentIntentId.startsWith('sim_')) {
        return this.markSucceeded(card.id, card.stream.id);
      }
      const intent = await this.stripe.client.paymentIntents.retrieve(card.stream.stripePaymentIntentId);
      if (intent.status === 'succeeded') {
        return this.markSucceeded(card.id, card.stream.id);
      }
      if (intent.status === 'canceled') {
        await this.markFailed(card.id, card.stream.id);
        return { id: card.id, status: 'failed' as const };
      }
    }

    return { id: card.id, status: card.paymentStatus };
  }

  async report(cardId: string, dto: ReportCardDto) {
    const card = await this.prisma.card.update({
      where: { id: cardId },
      data: {
        reportedAt: new Date(),
        reportReason: dto.reason?.trim() || null,
        photoModerationStatus: 'held',
      },
    });
    await this.prisma.event.create({
      data: {
        type: 'card_reported',
        creatorId: card.creatorId,
        frameId: card.frameId,
        cardId: card.id,
        giverId: card.giverId,
      },
    });
    return { reported: true };
  }

  async hide(cardId: string, creatorId: string) {
    const updated = await this.prisma.card.updateMany({
      where: { id: cardId, creatorId },
      data: { hiddenByCreator: true, photoModerationStatus: 'held' },
    });
    if (updated.count === 0) return null;
    await this.prisma.event.create({
      data: { type: 'card_hidden', creatorId, cardId },
    });
    return { hidden: true };
  }

  private async markSucceeded(cardId: string, streamId: string) {
    await this.prisma.stream.updateMany({
      where: { id: streamId, status: 'pending' },
      data: { status: 'succeeded', occurredAt: new Date() },
    });
    const card = await this.prisma.card.update({
      where: { id: cardId },
      data: { paymentStatus: 'succeeded' },
    });
    await this.prisma.event.create({
      data: {
        type: 'amount_completed',
        creatorId: card.creatorId,
        frameId: card.frameId,
        cardId: card.id,
        giverId: card.giverId,
        metadata: { amountCents: card.amountCents },
      },
    });
    return { id: card.id, status: 'succeeded' as const };
  }

  private async markFailed(cardId: string, streamId: string) {
    await this.prisma.stream.updateMany({
      where: { id: streamId, status: 'pending' },
      data: { status: 'failed' },
    });
    await this.prisma.card.update({
      where: { id: cardId },
      data: { paymentStatus: 'failed' },
    });
  }
}
