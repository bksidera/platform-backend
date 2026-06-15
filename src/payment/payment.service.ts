import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeService } from 'src/stripe/stripe.service';
import { LoggerService } from 'src/logger/logger.service';
import { CreateMomentIntentDto } from './dto/payment.dto';

/**
 * Staging-only payment simulation. The full Moment journey (amount, identity,
 * placement, the Hold, the mark landing) runs unchanged, but no Stripe call is
 * made and the Stream succeeds on first status poll. This is NOT a free lane:
 * it exists only for UX testing before Stripe is configured, and it refuses to
 * activate when a live Stripe key is present, so it can never reach the real
 * product. (The payment gate — Inscription requires a succeeded Stream — is
 * enforced identically in both modes.)
 */
export function paymentSimulationEnabled(configService: ConfigService): boolean {
  const flag = configService.get<string>('PAYMENT_SIMULATION') === 'true';
  const key = configService.get<string>('STRIPE_SECRET_KEY') ?? '';
  return flag && !key.startsWith('sk_live');
}

@Injectable()
export class PaymentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly configService: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  private get simulation() {
    return paymentSimulationEnabled(this.configService);
  }

  async createMomentIntent(dto: CreateMomentIntentDto) {
    const creator = await this.prisma.creator.findUnique({ where: { slug: dto.creatorSlug } });
    if (!creator) return { error: 'CREATOR_NOT_FOUND' as const };
    if (!this.simulation && (!creator.stripeAccountId || !creator.stripeOnboarded)) {
      return { error: 'CREATOR_NOT_ONBOARDED' as const };
    }

    // Guest checkout: the email is an account in embryo. Name refreshes to the latest given.
    const giver = await this.prisma.giver.upsert({
      where: { email: dto.email.toLowerCase().trim() },
      create: { email: dto.email.toLowerCase().trim(), name: dto.name },
      update: { name: dto.name },
    });

    let monument = null;
    if (dto.monumentSlug) {
      monument = await this.prisma.monument.findUnique({
        where: { qrSourceSlug: dto.monumentSlug },
      });
    }
    const venueStamp = monument
      ? `${monument.venue} · ${monument.eventDate.toISOString().slice(0, 10)}`
      : null;

    const stream = await this.prisma.stream.create({
      data: {
        giverId: giver.id,
        creatorId: creator.id,
        monumentId: monument?.id ?? null,
        type: 'moment',
        amountCents: dto.amountCents,
        venueStamp,
      },
    });

    let clientSecret: string;
    if (this.simulation) {
      const simId = `sim_${randomUUID()}`;
      clientSecret = `sim_secret_${stream.id}`;
      await this.prisma.stream.update({
        where: { id: stream.id },
        data: { stripePaymentIntentId: simId },
      });
    } else {
      const intent = await this.stripe.client.paymentIntents.create({
        amount: dto.amountCents,
        currency: 'usd',
        automatic_payment_methods: { enabled: true },
        transfer_data: { destination: creator.stripeAccountId },
        metadata: { streamId: stream.id },
        receipt_email: giver.email,
      });
      clientSecret = intent.client_secret;
      await this.prisma.stream.update({
        where: { id: stream.id },
        data: { stripePaymentIntentId: intent.id },
      });
    }

    await this.prisma.event.create({
      data: {
        type: 'checkout_start',
        creatorId: creator.id,
        monumentId: monument?.id ?? null,
        giverId: giver.id,
        sourceSlug: dto.monumentSlug ?? null,
      },
    });

    return { streamId: stream.id, clientSecret };
  }

  // Polled by the client after confirm; reconciles directly with Stripe so the
  // watch-it-land moment never waits on webhook delivery.
  async streamStatus(streamId: string) {
    const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
    if (!stream) return null;
    if (stream.status === 'pending' && stream.stripePaymentIntentId) {
      if (this.simulation && stream.stripePaymentIntentId.startsWith('sim_')) {
        return this.markSucceeded(stream.id);
      }
      const intent = await this.stripe.client.paymentIntents.retrieve(
        stream.stripePaymentIntentId,
      );
      if (intent.status === 'succeeded') {
        return this.markSucceeded(stream.id);
      }
    }
    return { id: stream.id, status: stream.status };
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    const event = this.stripe.client.webhooks.constructEvent(
      rawBody,
      signature,
      this.configService.get<string>('STRIPE_WEBHOOK_SECRET'),
    );

    if (event.type === 'payment_intent.succeeded' || event.type === 'payment_intent.payment_failed') {
      const intent = event.data.object as Stripe.PaymentIntent;
      const streamId = intent.metadata?.streamId;
      if (!streamId) return { received: true };

      if (event.type === 'payment_intent.succeeded') {
        await this.markSucceeded(streamId);
      } else {
        await this.prisma.stream.updateMany({
          where: { id: streamId, status: 'pending' },
          data: { status: 'failed' },
        });
      }
    }
    return { received: true };
  }

  private async markSucceeded(streamId: string) {
    const updated = await this.prisma.stream.updateMany({
      where: { id: streamId, status: 'pending' },
      data: { status: 'succeeded', occurredAt: new Date() },
    });
    if (updated.count > 0) {
      const stream = await this.prisma.stream.findUnique({ where: { id: streamId } });
      await this.prisma.event.create({
        data: {
          type: 'checkout_complete',
          creatorId: stream.creatorId,
          monumentId: stream.monumentId,
          giverId: stream.giverId,
          metadata: { amountCents: stream.amountCents, streamType: stream.type },
        },
      });
    }
    return { id: streamId, status: 'succeeded' as const };
  }
}
