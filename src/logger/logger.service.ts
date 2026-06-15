import { Injectable } from '@nestjs/common';

// Vercel captures stdout/stderr; structured transports can come later if needed.
@Injectable()
export class LoggerService {
  log(message: string) {
    console.log(message);
  }

  warn(message: string) {
    console.warn(message);
  }

  error(message: string) {
    console.error(message);
  }
}
