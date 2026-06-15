import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';

export interface AuthPrincipal {
  id: string;
  kind: 'creator' | 'giver';
  email: string;
  name: string;
  slug?: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly prismaService: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET,
    });
  }

  async validate(payload: { sub: string; kind: 'creator' | 'giver' }): Promise<AuthPrincipal> {
    const unauthorized = () =>
      new HttpException(
        { status: false, message: 'UNAUTHORIZED', data: {} },
        HttpStatus.UNAUTHORIZED,
      );

    if (!payload?.sub || !payload?.kind) throw unauthorized();

    if (payload.kind === 'creator') {
      const creator = await this.prismaService.creator.findUnique({
        where: { id: payload.sub },
        select: { id: true, email: true, name: true, slug: true },
      });
      if (!creator) throw unauthorized();
      return { ...creator, kind: 'creator' };
    }

    const giver = await this.prismaService.giver.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, name: true },
    });
    if (!giver) throw unauthorized();
    return { ...giver, kind: 'giver' };
  }
}
