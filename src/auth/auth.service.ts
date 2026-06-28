import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { MailService } from 'src/mail/mail.service';

const TOKEN_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly mailService: MailService,
    private readonly configService: ConfigService,
  ) {}

  private async issueToken(email: string, kind: 'creator' | 'giver') {
    const token = randomBytes(32).toString('hex');
    await this.prisma.magicLinkToken.create({
      data: { token, email, kind, expiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });
    const base =
      this.configService.get<string>('FRONTEND_PRODUCTION_URL') ??
      this.configService.get<string>('FRONTEND_BASE_URL');
    const link = `${base}/auth/verify?token=${token}`;
    await this.mailService.sendMagicLink(email, link, kind);
  }

  private async uniqueSlug(name: string) {
    const base =
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 40) || 'artist';
    let slug = base;
    for (let i = 2; await this.prisma.creator.findUnique({ where: { slug } }); i++) {
      slug = `${base}-${i}`;
    }
    return slug;
  }

  // Creators: sign in, creating the account on first request when a name is given.
  async requestCreatorLink(email: string, name?: string): Promise<{ sent: boolean; reason?: string }> {
    const normalized = email.toLowerCase().trim();
    let creator = await this.prisma.creator.findUnique({ where: { email: normalized } });
    if (!creator) {
      if (!name) return { sent: false, reason: 'NAME_REQUIRED_FOR_NEW_CREATOR' };
      creator = await this.prisma.creator.create({
        data: { email: normalized, name, slug: await this.uniqueSlug(name) },
      });
    }
    await this.issueToken(normalized, 'creator');
    return { sent: true };
  }

  // Givers: claim an identity that already accumulated via guest checkout.
  async requestClaimLink(email: string): Promise<{ sent: boolean; reason?: string }> {
    const normalized = email.toLowerCase().trim();
    const giver = await this.prisma.giver.findUnique({ where: { email: normalized } });
    if (!giver) return { sent: false, reason: 'NO_RECORD_FOR_EMAIL' };
    await this.issueToken(normalized, 'giver');
    return { sent: true };
  }

  async verify(token: string) {
    const record = await this.prisma.magicLinkToken.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) return null;

    await this.prisma.magicLinkToken.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    });

    if (record.kind === 'creator') {
      const creator = await this.prisma.creator.findUnique({ where: { email: record.email } });
      if (!creator) return null;
      return {
        token: this.jwtService.sign({ sub: creator.id, kind: 'creator' }),
        kind: 'creator' as const,
        profile: {
          id: creator.id,
          name: creator.name,
          slug: creator.slug,
          email: creator.email,
          stripeOnboarded: creator.stripeOnboarded,
        },
      };
    }

    const giver = await this.prisma.giver.update({
      where: { email: record.email },
      data: { status: 'claimed' },
    });
    await this.prisma.event.create({
      data: { type: 'claim', giverId: giver.id },
    });
    return {
      token: this.jwtService.sign({ sub: giver.id, kind: 'giver' }),
      kind: 'giver' as const,
      profile: { id: giver.id, name: giver.name, email: giver.email },
    };
  }
}
