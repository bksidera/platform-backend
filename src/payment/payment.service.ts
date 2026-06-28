import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeService } from 'src/stripe/stripe.service';
import { LoggerService } from 'src/logger/logger.service';

/**
 * Staging-only payment simulation. Amount-card journeys run unchanged, but no
 * Stripe call is made and the Stream succeeds on first status poll. This is
 * NOT a free lane: it exists only for UX testing before Stripe is configured,
 * and it refuses to activate when a live Stripe key is present.
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
        await this.prisma.card.updateMany({
          where: { streamId },
          data: { paymentStatus: 'failed' },
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
      const stream = await this.prisma.stream.findUnique({
        where: { id: streamId },
        include: { card: true },
      });
      const card = await this.prisma.card.updateMany({
        where: { streamId },
        data: { paymentStatus: 'succeeded' },
      });
      await this.prisma.event.create({
        data: {
          type: 'amount_completed',
          creatorId: stream.creatorId,
          frameId: stream.card?.frameId ?? null,
          cardId: stream.card?.id ?? null,
          giverId: stream.giverId,
          metadata: { amountCents: stream.amountCents, streamType: stream.type, cardsUpdated: card.count },
        },
      });
    }
    return { id: streamId, status: 'succeeded' as const };
  }
}
