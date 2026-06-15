import { ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthPrincipal } from 'src/jwt-strategy/jwt-strategy.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}

// Restricts a route to authenticated creators.
@Injectable()
export class CreatorGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest<TUser = AuthPrincipal>(err: unknown, user: AuthPrincipal | false): TUser {
    if (err || !user) throw new ForbiddenException('Sign-in required');
    if (user.kind !== 'creator') throw new ForbiddenException('Creator account required');
    return user as TUser;
  }
}
