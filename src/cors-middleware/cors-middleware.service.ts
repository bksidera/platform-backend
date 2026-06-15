import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class CorsMiddlewareService implements NestMiddleware {
    use(req: Request, res: Response, next: NextFunction) {
        // req.setHeader('Access-Control-Allow-Origin', '*');
        // Add any additional CORS headers if needed
        req.headers['access-control-allow-origin'] = '*'
        next();
    }
}
