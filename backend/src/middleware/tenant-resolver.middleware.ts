import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';
import { TenantConnectionService } from '../database/tenant-connection.service';

/**
 * TenantResolverMiddleware
 *
 * Intercepts incoming HTTP requests, decodes the JWT to find the `tenantDbName`,
 * resolves a live Mongoose Connection for that tenant database, and attaches it
 * to `req.tenantConnection` so downstream REQUEST-scoped services can use it.
 *
 * NOTE: Auth guards run AFTER middleware, so this middleware decodes the token
 * manually (without verifying signature for performance) — the JwtAuthGuard still
 * fully verifies the token. We only need the payload to resolve the DB connection early.
 */
@Injectable()
export class TenantResolverMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TenantResolverMiddleware.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tenantConnectionService: TenantConnectionService,
  ) {}

  async use(req: Request & { tenantConnection?: any }, res: Response, next: NextFunction) {
    const authHeader = req.headers.authorization;

    // No token = let guard handle it; skip DB resolution
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.split(' ')[1];

    try {
      // Decode without verification — JwtAuthGuard verifies fully later
      const payload = jwt.decode(token) as any;

      if (!payload?.tenantDbName) {
        // Old token or public route — guard will catch if auth is required
        return next();
      }

      // Establish or retrieve cached connection for this tenant
      const connection = await this.tenantConnectionService.getConnection(payload.tenantDbName);
      req.tenantConnection = connection;

      this.logger.debug(`Tenant connection resolved: ${payload.tenantDbName}`);
    } catch (err) {
      // Non-fatal — guard will handle auth errors
      this.logger.warn(`Tenant resolution skipped: ${err.message}`);
    }

    next();
  }
}
