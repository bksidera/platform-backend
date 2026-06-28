import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ejs from 'ejs';
import * as path from 'path';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

@Injectable()
export class MailService {
  private readonly mailgun;
  private readonly provider: 'resend' | 'mailgun';
  private readonly domain?: string;
  private readonly from: string;
  private readonly resendApiKey?: string;

  constructor(private readonly configService: ConfigService) {
    const configuredProvider = this.configService.get<string>('MAIL_PROVIDER');
    this.provider = configuredProvider === 'mailgun' ? 'mailgun' : 'resend';

    if (this.provider === 'resend') {
      this.resendApiKey = this.configService.get<string>('RESEND_API_KEY');
      this.from =
        this.configService.get<string>('MAIL_FROM') ??
        this.configService.get<string>('RESEND_FROM') ??
        'PLATFORM <hello@mail.prymr.xyz>';
      this.mailgun = null;
      return;
    }

    const apiKey = this.configService.get<string>('MAILGUN_API_KEY');
    this.domain = this.configService.get<string>('MAILGUN_DOMAIN');
    this.mailgun = apiKey && this.domain
      ? new Mailgun(formData).client({ username: 'api', key: apiKey })
      : null;
    this.from = this.configService.get<string>('MAIL_FROM') ?? `PLATFORM <support@${this.domain}>`;
  }

  async sendTemplate(mailDetails: {
    fileName: string;
    to: string;
    subject: string;
    data: Record<string, unknown>;
  }): Promise<boolean> {
    const templatePath = path.join(process.cwd(), 'src', 'mail', 'View', mailDetails.fileName);
    const html = await ejs.renderFile(templatePath, mailDetails.data);

    if (this.provider === 'resend') {
      if (!this.resendApiKey) throw new Error('RESEND_API_KEY is missing in configuration.');
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: this.from,
          to: [mailDetails.to],
          subject: mailDetails.subject,
          html,
        }),
      });
      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Resend email failed: ${response.status} ${body}`);
      }
      return true;
    }

    if (!this.mailgun || !this.domain) {
      throw new Error('Mailgun API key or domain is missing in configuration.');
    }

    const response = await this.mailgun.messages.create(this.domain, {
      from: this.from,
      to: mailDetails.to,
      subject: mailDetails.subject,
      html,
    });
    return response.status === 200;
  }

  async sendMagicLink(to: string, link: string, kind: 'creator' | 'giver') {
    return this.sendTemplate({
      fileName: 'MagicLink.ejs',
      to,
      subject: kind === 'creator' ? 'Your sign-in link' : 'Claim your place',
      data: { link, kind },
    });
  }

  async sendCardPlaced(to: string, data: {
    creatorName: string;
    frameTitle: string;
    displayName: string;
    note?: string | null;
    amountCents?: number | null;
    cardUrl: string;
  }) {
    return this.sendTemplate({
      fileName: 'CardPlaced.ejs',
      to,
      subject: `New card on ${data.frameTitle}`,
      data,
    });
  }
}
