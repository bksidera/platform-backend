import { FrameService } from './frame.service';

describe('FrameService', () => {
  function serviceWith(prisma: object) {
    return new FrameService(prisma as never);
  }

  it('creates a frame with a unique slug for the creator', async () => {
    const prisma = {
      frame: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'frame-1', slug: 'blue-door-abc123' }),
      },
    };
    const service = serviceWith(prisma);

    await service.create('creator-1', {
      title: 'Blue Door',
      context: 'June 11',
      imageUrl: 'https://example.test/frame.jpg',
    });

    expect(prisma.frame.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        creatorId: 'creator-1',
        title: 'Blue Door',
        context: 'June 11',
        imageUrl: 'https://example.test/frame.jpg',
      }),
    });
  });

  it('lists creator frames with card counts', async () => {
    const prisma = {
      frame: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'frame-1',
            title: 'A',
            _count: { cards: 3 },
            cards: [
              {
                amountCents: 1000,
                paymentStatus: 'succeeded',
                photoUrl: null,
                photoModerationStatus: null,
                hiddenByCreator: false,
                visibility: 'public',
              },
              {
                amountCents: 2500,
                paymentStatus: 'pending',
                photoUrl: 'https://example.test/card.jpg',
                photoModerationStatus: 'held',
                hiddenByCreator: false,
                visibility: 'public',
              },
              {
                amountCents: null,
                paymentStatus: 'none',
                photoUrl: null,
                photoModerationStatus: null,
                hiddenByCreator: true,
                visibility: 'public',
              },
            ],
          },
        ]),
      },
    };
    const service = serviceWith(prisma);

    await expect(service.listMine('creator-1')).resolves.toEqual([
      {
        id: 'frame-1',
        title: 'A',
        cardCount: 3,
        visibleCardCount: 2,
        amountReceivedCents: 1000,
        amountPendingCents: 2500,
        heldPhotoCount: 1,
      },
    ]);
  });

  it('returns public frame cards without pending photos or public amounts', async () => {
    const prisma = {
      frame: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'frame-1',
          title: 'Blue Door',
          context: 'June 11',
          imageUrl: 'https://example.test/frame.jpg',
          slug: 'blue-door',
          status: 'active',
          creator: { name: 'Maria Vane', slug: 'maria-vane' },
          cards: [
            {
              id: 'card-1',
              displayName: 'Ari',
              note: 'Beautiful.',
              photoUrl: 'https://example.test/card.jpg',
              photoModerationStatus: 'pending',
              amountCents: 1000,
              currency: 'usd',
              paymentStatus: 'succeeded',
              visibility: 'public',
              createdAt: new Date('2026-06-11T20:00:00.000Z'),
            },
          ],
        }),
      },
    };
    const service = serviceWith(prisma);

    await expect(service.publicBySlug('blue-door')).resolves.toMatchObject({
      cards: [
        {
          id: 'card-1',
          photoUrl: null,
          amountCents: null,
          hasAmount: true,
        },
      ],
    });
    expect(prisma.frame.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          cards: expect.objectContaining({
            where: { hiddenByCreator: false, reportedAt: null, visibility: 'public' },
          }),
        }),
      }),
    );
  });

  it('returns creator frame cards with private amount and review data', async () => {
    const prisma = {
      frame: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'frame-1',
          title: 'Blue Door',
          context: 'June 11',
          imageUrl: 'https://example.test/frame.jpg',
          slug: 'blue-door',
          status: 'active',
          creator: { name: 'Maria Vane', slug: 'maria-vane' },
          cards: [
            {
              id: 'card-1',
              displayName: 'Ari',
              email: 'ari@example.test',
              note: 'Beautiful.',
              photoUrl: 'https://example.test/card.jpg',
              photoModerationStatus: 'pending',
              amountCents: 2500,
              currency: 'usd',
              paymentStatus: 'succeeded',
              visibility: 'private',
              hiddenByCreator: false,
              createdAt: new Date('2026-06-11T20:00:00.000Z'),
            },
          ],
        }),
      },
    };
    const service = serviceWith(prisma);

    await expect(service.creatorBySlug('creator-1', 'blue-door')).resolves.toMatchObject({
      cards: [
        {
          id: 'card-1',
          email: 'ari@example.test',
          photoUrl: 'https://example.test/card.jpg',
          photoModerationStatus: 'pending',
          amountCents: 2500,
          hasAmount: true,
          visibility: 'private',
        },
      ],
    });
    expect(prisma.frame.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { slug: 'blue-door', creatorId: 'creator-1' },
      }),
    );
  });
});
