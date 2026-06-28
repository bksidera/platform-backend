import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as express from 'express';
import { HttpException, HttpStatus, ValidationPipe } from '@nestjs/common';

const port = process.env.PORT || 3000;
type RateLimitRule = { pattern: RegExp; limit: number; windowMs: number };
const rateLimitRules: RateLimitRule[] = [
  { pattern: /^\/backend-api\/auth\/.*\/requestLink$/, limit: 5, windowMs: 15 * 60 * 1000 },
  { pattern: /^\/backend-api\/frames\/[^/]+\/cards$/, limit: 12, windowMs: 10 * 60 * 1000 },
  { pattern: /^\/backend-api\/file-upload\/uploadsmallcontent$/, limit: 20, windowMs: 10 * 60 * 1000 },
  { pattern: /^\/backend-api\/events\/track$/, limit: 120, windowMs: 10 * 60 * 1000 },
];
const rateBuckets = new Map<string, { count: number; resetAt: number }>();

function clientKey(req: express.Request) {
  const forwarded = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0];
  return (ip ?? req.ip ?? req.socket.remoteAddress ?? 'unknown').trim();
}

function rateLimitMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.method === 'OPTIONS') return next();
  const rule = rateLimitRules.find((candidate) => candidate.pattern.test(req.path));
  if (!rule) return next();

  const now = Date.now();
  const key = `${clientKey(req)}:${req.method}:${rule.pattern.source}`;
  const current = rateBuckets.get(key);
  if (!current || current.resetAt <= now) {
    rateBuckets.set(key, { count: 1, resetAt: now + rule.windowMs });
    return next();
  }
  current.count += 1;
  if (current.count > rule.limit) {
    const retryAfter = Math.ceil((current.resetAt - now) / 1000);
    res.setHeader('Retry-After', String(retryAfter));
    return res.status(429).json({ status: false, message: 'Too many requests', data: {} });
  }
  return next();
}

function requireEnv(name: string) {
  if (!process.env[name]) throw new Error(`${name} is required`);
}

function validateRuntimeConfig() {
  requireEnv('DATABASE_URL');
  requireEnv('JWT_SECRET');

  if (process.env.NODE_ENV !== 'production') return;

  if (!process.env.FRONTEND_BASE_URL && !process.env.FRONTEND_PRODUCTION_URL) {
    throw new Error('FRONTEND_BASE_URL or FRONTEND_PRODUCTION_URL is required');
  }

  const simulation = process.env.PAYMENT_SIMULATION === 'true';
  requireEnv('STRIPE_SECRET_KEY');
  if (!simulation) requireEnv('STRIPE_WEBHOOK_SECRET');
  if (simulation && process.env.STRIPE_SECRET_KEY?.startsWith('sk_live')) {
    throw new Error('PAYMENT_SIMULATION cannot be enabled with a live Stripe key');
  }

  const provider = process.env.MAIL_PROVIDER === 'mailgun' ? 'mailgun' : 'resend';
  if (provider === 'resend') {
    requireEnv('RESEND_API_KEY');
    if (!process.env.MAIL_FROM && !process.env.RESEND_FROM) {
      throw new Error('MAIL_FROM or RESEND_FROM is required for Resend');
    }
  } else {
    requireEnv('MAILGUN_API_KEY');
    requireEnv('MAILGUN_DOMAIN');
  }
}

async function bootstrap() {
  validateRuntimeConfig();

  const app = await NestFactory.create(AppModule, { rawBody: true, bodyParser: true });
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  const allowedOrigins = [
    process.env.FRONTEND_BASE_URL,
    process.env.FRONTEND_PRODUCTION_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean);
  const isAllowedOrigin = (origin?: string) => {
    if (!origin) return true;
    if (allowedOrigins.includes(origin)) return true;
    return (
      /^https:\/\/platform-frontend-[a-z0-9-]+\.vercel\.app$/.test(origin) ||
      /^https:\/\/platform-frontend(-[a-z0-9]+)?-rbkiekel-gmailcoms-projects\.vercel\.app$/.test(origin)
    );
  };

  app.enableCors({
    origin: (origin, callback) => {
      callback(null, isAllowedOrigin(origin));
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.setGlobalPrefix('backend-api');

  // Stripe webhook signature verification needs the raw body.
  app.use('/backend-api/payment/webhook', express.raw({ type: 'application/json' }));

  app.use(express.json({ limit: '25mb' }));
  app.use(express.urlencoded({ limit: '25mb', extended: true }));
  app.use(rateLimitMiddleware);

  app.useGlobalPipes(
    new ValidationPipe({
      exceptionFactory: (errors) => {
        const result = errors.map((error) => ({
          property: error.property,
          message: error.constraints[Object.keys(error.constraints)[0]],
        }));
        return new HttpException(
          { status: false, message: 'Validation failed', data: result },
          HttpStatus.OK,
        );
      },
      stopAtFirstError: true,
    }),
  );

  await app.listen(port);
}
bootstrap();
