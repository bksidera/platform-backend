import { validate } from 'class-validator';
import { ConfigService } from '@nestjs/config';
import { CardService } from './card.service';
import { CreateCardDto } from './dto/card.dto';

describe('CardService', () => {
  function serviceWith(prisma: object) {
    const stripe = {
      client: {
        paymentIntents: {
          create: jest.fn(),
          retrieve: jest.fn(),
        },
      },
    };
    const config = { get: jest.fn((key: string) => (key === 'PAYMENT_SIMULATION' ? 'true' : undefined)) };
    return {
      service: new CardService(
        prisma as never,
        stripe as never,
        config as unknown as ConfigService,
      ),
      stripe,
    };
  }

  it('requires email on card creation DTOs', async () => {
    const dto = new CreateCardDto();
    dto.displayName = 'Ari';
    dto.note = 'Beautiful.';

    const errors = await validate(dto);

    expect(errors.some((error) => error.property === 'email')).toBe(true);
  });

  it('creates a no-amount card without Stripe', async () => {
    const prisma = {
      frame: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'frame-1',
          creatorId: 'creator-1',
          status: 'active',
          creator: { id: 'creator-1' },
        }),
      },
      giver: {
        upsert: jest.fn().mockResolvedValue({ id: 'giver-1' }),
      },
      card: {
        create: jest.fn().mockResolvedValue({
          id: 'card-1',
          displayName: 'Ari',
          note: 'Beautiful.',
          photoUrl: null,
          photoModerationStatus: null,
          amountCents: null,
          currency: 'usd',
          paymentStatus: 'none',
          visibility: 'public',
          createdAt: new Date('2026-06-11T20:00:00.000Z'),
        }),
      },
      event: {
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
    };
    const { service, stripe } = serviceWith(prisma);

    await expect(
      service.createForFrame('blue-door', {
        displayName: 'Ari',
        email: 'ari@example.test',
        note: 'Beautiful.',
      }),
    ).resolves.toMatchObject({ card: { id: 'card-1', paymentStatus: 'none' } });
    expect(stripe.client.paymentIntents.create).not.toHaveBeenCalled();
  });

  it('creates an amount card without marking payment pending before intent creation', async () => {
    const prisma = {
      frame: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'frame-1',
          creatorId: 'creator-1',
          status: 'active',
          creator: { id: 'creator-1' },
        }),
      },
      giver: {
        upsert: jest.fn().mockResolvedValue({ id: 'giver-1' }),
      },
      card: {
        create: jest.fn().mockResolvedValue({
          id: 'card-1',
          displayName: 'Ari',
          note: 'Beautiful.',
          photoUrl: null,
          photoModerationStatus: null,
          amountCents: 1000,
          currency: 'usd',
          paymentStatus: 'none',
          visibility: 'public',
          createdAt: new Date('2026-06-11T20:00:00.000Z'),
        }),
      },
      event: {
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
    };
    const { service } = serviceWith(prisma);

    await service.createForFrame('blue-door', {
      displayName: 'Ari',
      email: 'ari@example.test',
      note: 'Beautiful.',
      amountCents: 1000,
    });

    expect(prisma.card.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ amountCents: 1000, paymentStatus: 'none' }),
    });
  });

  it('creates an amount stream and simulated payment intent anchored to the card', async () => {
    const prisma = {
      card: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'card-1',
          creatorId: 'creator-1',
          giverId: 'giver-1',
          frameId: 'frame-1',
          amountCents: 1000,
          currency: 'usd',
          email: 'ari@example.test',
          hiddenByCreator: false,
          reportedAt: null,
          creator: { stripeAccountId: null, stripeOnboarded: false },
          giver: { id: 'giver-1' },
          stream: null,
          frame: { slug: 'blue-door', context: 'June 11' },
        }),
        update: jest.fn().mockResolvedValue({ id: 'card-1' }),
      },
      stream: {
        create: jest.fn().mockResolvedValue({ id: 'stream-1', stripePaymentIntentId: null }),
        update: jest.fn().mockResolvedValue({ id: 'stream-1' }),
      },
      event: {
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
    };
    const { service } = serviceWith(prisma);

    await expect(service.createPaymentIntent('card-1')).resolves.toMatchObject({
      cardId: 'card-1',
      streamId: 'stream-1',
      clientSecret: 'sim_secret_stream-1',
    });
    expect(prisma.card.update).toHaveBeenCalledWith({
      where: { id: 'card-1' },
      data: { streamId: 'stream-1', paymentStatus: 'pending' },
    });
  });

  it('polls simulated payment success and marks the card succeeded', async () => {
    const prisma = {
      card: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'card-1',
          stream: {
            id: 'stream-1',
            status: 'pending',
            stripePaymentIntentId: 'sim_123',
          },
          frame: { slug: 'blue-door' },
        }),
        update: jest.fn().mockResolvedValue({
          id: 'card-1',
          creatorId: 'creator-1',
          frameId: 'frame-1',
          giverId: 'giver-1',
          amountCents: 1000,
        }),
      },
      stream: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      event: {
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
    };
    const { service } = serviceWith(prisma);

    await expect(service.paymentStatus('card-1')).resolves.toEqual({
      id: 'card-1',
      status: 'succeeded',
    });
  });

  it('returns card payment state even before a stream exists', async () => {
    const prisma = {
      card: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'card-1',
          paymentStatus: 'none',
          stream: null,
          frame: { slug: 'blue-door' },
        }),
      },
    };
    const { service } = serviceWith(prisma);

    await expect(service.paymentStatus('card-1')).resolves.toEqual({
      id: 'card-1',
      status: 'none',
    });
  });

  it('allows only the owning creator to hide a card', async () => {
    const prisma = {
      card: {
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      event: {
        create: jest.fn().mockResolvedValue({ id: 'event-1' }),
      },
    };
    const { service } = serviceWith(prisma);

    await expect(service.hide('card-1', 'creator-1')).resolves.toEqual({ hidden: true });
    expect(prisma.card.updateMany).toHaveBeenCalledWith({
      where: { id: 'card-1', creatorId: 'creator-1' },
      data: { hiddenByCreator: true, photoModerationStatus: 'held' },
    });
  });
});
