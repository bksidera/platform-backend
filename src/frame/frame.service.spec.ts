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
          { id: 'frame-1', title: 'A', _count: { cards: 2 } },
        ]),
      },
    };
    const service = serviceWith(prisma);

    await expect(service.listMine('creator-1')).resolves.toEqual([
      { id: 'frame-1', title: 'A', cardCount: 2 },
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
  });
});
