import { Body, Controller, Get, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { ResponseService } from 'src/response/response.service';
import { JwtAuthGuard } from 'src/guards/guards.service';
import { RequestClaimLinkDto, RequestCreatorLinkDto, VerifyMagicLinkDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly responseService: ResponseService,
  ) {}

  @Post('creator/requestLink')
  async requestCreatorLink(@Body() dto: RequestCreatorLinkDto, @Res() res: Response) {
    const result = await this.authService.requestCreatorLink(dto.email, dto.name);
    if (!result.sent) {
      return this.responseService.incorrectData(result.reason, res);
    }
    return this.responseService.success('success', 'Sign-in link sent', {}, res);
  }

  @Post('claim/requestLink')
  async requestClaimLink(@Body() dto: RequestClaimLinkDto, @Res() res: Response) {
    const result = await this.authService.requestClaimLink(dto.email);
    if (!result.sent) {
      return this.responseService.incorrectData(result.reason, res);
    }
    return this.responseService.success('success', 'Claim link sent', {}, res);
  }

  @Post('verify')
  async verify(@Body() dto: VerifyMagicLinkDto, @Res() res: Response) {
    const session = await this.authService.verify(dto.token);
    if (!session) {
      return this.responseService.EXPIRED('This link has expired or was already used', res);
    }
    return this.responseService.success('success', 'Signed in', session, res);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req, @Res() res: Response) {
    return this.responseService.success('success', 'OK', req.user, res);
  }
}
