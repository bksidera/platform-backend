import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/prisma/prisma.service';
import { StripeService } from 'src/stripe/stripe.service';
import { paymentSimulationEnabled } from 'src/payment/payment.service';
import { UpdateArchiveDto } from './dto/creator.dto';

@Injectable()
export class CreatorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly configService: ConfigService,
  ) {}

  // Creates the Express account on first call, then returns a fresh onboarding link.
  async startOnboarding(creatorId: string): Promise<{ url: string }> {
    const creator = await this.prisma.creator.findUnique({ where: { id: creatorId } });

    let accountId = creator.stripeAccountId;
    if (!accountId) {
      const account = await this.stripe.client.accounts.create({
        type: 'express',
        email: creator.email,
        business_profile: { name: creator.name },
      });
      accountId = account.id;
      await this.prisma.creator.update({
        where: { id: creatorId },
        data: { stripeAccountId: accountId },
      });
    }

    const base = this.configService.get<string>('FRONTEND_BASE_URL');
    const link = await this.stripe.client.accountLinks.create({
      account: accountId,
      refresh_url: `${base}/dashboard/onboarding?refresh=1`,
      return_url: `${base}/dashboard/onboarding?return=1`,
      type: 'account_onboarding',
    });
    return { url: link.url };
  }

  async onboardingStatus(creatorId: string) {
    if (paymentSimulationEnabled(this.configService)) {
      return { onboarded: true, hasAccount: true, simulated: true };
    }
    const creator = await this.prisma.creator.findUnique({ where: { id: creatorId } });
    if (!creator.stripeAccountId) {
      return { onboarded: false, hasAccount: false };
    }
    const account = await this.stripe.client.accounts.retrieve(creator.stripeAccountId);
    const onboarded = Boolean(account.charges_enabled && account.details_submitted);
    if (onboarded !== creator.stripeOnboarded) {
      await this.prisma.creator.update({
        where: { id: creatorId },
        data: { stripeOnboarded: onboarded },
      });
    }
    return { onboarded, hasAccount: true };
  }

  async updateArchive(creatorId: string, dto: UpdateArchiveDto) {
    return this.prisma.creator.update({
      where: { id: creatorId },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.bio !== undefined && { bio: dto.bio }),
        ...(dto.heroImageUrl !== undefined && { heroImageUrl: dto.heroImageUrl }),
        ...(dto.mediaLinks !== undefined && { mediaLinks: dto.mediaLinks as object[] }),
        ...(dto.archiveVisibility !== undefined && { archiveVisibility: dto.archiveVisibility }),
      },
      select: {
        id: true,
        name: true,
        slug: true,
        bio: true,
        heroImageUrl: true,
        mediaLinks: true,
        archiveVisibility: true,
        stripeOnboarded: true,
      },
    });
  }

  // Public Archive. Aggregate counts always; named Stewards only under two-key rules (B6).
  async publicArchive(slug: string) {
    const creator = await this.prisma.creator.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        bio: true,
        heroImageUrl: true,
        mediaLinks: true,
        stripeOnboarded: true,
      },
    });
    if (!creator) return null;

    const stewardCount = await this.prisma.stewardship.count({
      where: { creatorId: creator.id, status: 'active' },
    });

    const { id, ...publicFields } = creator;
    return { ...publicFields, stewardCount };
  }
}
