import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as ejs from 'ejs';
import * as path from 'path';
import Mailgun from 'mailgun.js';
import formData from 'form-data';

@Injectable()
export class MailService {
  private readonly mailgun;
  private readonly domain: string;
  private readonly from: string;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>('MAILGUN_API_KEY');
    this.domain = this.configService.get<string>('MAILGUN_DOMAIN');
    if (!apiKey || !this.domain) {
      throw new Error('Mailgun API key or domain is missing in configuration.');
    }
    this.mailgun = new Mailgun(formData).client({ username: 'api', key: apiKey });
    this.from = `PLATFORM <support@${this.domain}>`;
  }

  async sendTemplate(mailDetails: {
    fileName: string;
    to: string;
    subject: string;
    data: Record<string, unknown>;
  }): Promise<boolean> {
    const templatePath = path.join(process.cwd(), 'src', 'mail', 'View', mailDetails.fileName);
    const html = await ejs.renderFile(templatePath, mailDetails.data);

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
}
