import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import mongoose, { Connection, Model, Schema } from 'mongoose';
import { TENANT_MODELS } from './tenant-models';

/**
 * TenantConnectionService
 *
 * The core engine of the multi-tenant architecture.
 * Maintains a pool of Mongoose connections — one per company database.
 * Creates connections lazily on first request and caches them for reuse.
 * Safely closes all connections on application shutdown.
 */
@Injectable()
export class TenantConnectionService implements OnModuleDestroy {
  private readonly logger = new Logger(TenantConnectionService.name);
  private readonly connections = new Map<string, Connection>();

  constructor(private readonly configService: ConfigService) {}

  /**
   * Returns a cached Mongoose connection for the given tenant database name.
   * Creates a new connection if one does not exist yet.
   */
  async getConnection(databaseName: string): Promise<Connection> {
    if (this.connections.has(databaseName)) {
      return this.connections.get(databaseName)!;
    }

    this.logger.log(`Creating new DB connection for tenant: ${databaseName}`);

    // Build the base URI (without any database path segment)
    const baseUri = this.getBaseUri();
    const uri = `${baseUri}/${databaseName}`;

    const connection = await mongoose.createConnection(uri, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 10000,
    }).asPromise();

    // Pre-register all models to resolve reference Population faults
    for (const model of TENANT_MODELS) {
      if (!connection.modelNames().includes(model.name)) {
        connection.model(model.name, model.schema);
      }
    }

    this.connections.set(databaseName, connection);
    this.logger.log(`Connection established for tenant: ${databaseName}`);
    return connection;
  }

  /**
   * Dynamically resolves a Mongoose Model bound to the specific tenant connection.
   * This is the method all feature services use to get their models.
   */
  async getModel<T>(
    databaseName: string,
    modelName: string,
    schema: Schema,
  ): Promise<Model<T>> {
    const connection = await this.getConnection(databaseName);

    // If the model is already registered on this connection, return it directly
    if (connection.modelNames().includes(modelName)) {
      return connection.model<T>(modelName);
    }

    return connection.model<T>(modelName, schema);
  }

  /**
   * Returns the base MongoDB URI (without any database path).
   * Handles both Atlas SRV URIs and standard connection strings.
   *
   * The MONGODB_URI env var should already be the base cluster URI,
   * e.g. mongodb+srv://user:pass@cluster.xxx.net
   * but we strip any accidental trailing path/database for safety.
   */
  private getBaseUri(): string {
    const uri = this.configService.get<string>('MONGODB_URI') || '';

    try {
      // Use URL parsing to safely strip any database path
      // We replace the mongo scheme temporarily since URL doesn't support mongodb+srv
      const isAtlas = uri.startsWith('mongodb+srv://');
      const parseable = uri.replace(/^mongodb(\+srv)?:\/\//, 'http://');
      const parsed = new URL(parseable);

      // Rebuild: scheme + auth + host (no pathname, no query)
      const scheme = isAtlas ? 'mongodb+srv' : 'mongodb';
      const auth = parsed.username
        ? `${parsed.username}:${parsed.password}@`
        : '';
      return `${scheme}://${auth}${parsed.host}`;
    } catch {
      // Fallback: just strip trailing slashes
      return uri.replace(/\/+$/, '');
    }
  }

  /**
   * Gracefully close all tenant connections on app shutdown.
   */
  async onModuleDestroy(): Promise<void> {
    this.logger.log(`Closing ${this.connections.size} tenant database connections...`);
    const closePromises = Array.from(this.connections.entries()).map(
      async ([dbName, connection]) => {
        await connection.close();
        this.logger.log(`Closed connection for: ${dbName}`);
      },
    );
    await Promise.all(closePromises);
    this.connections.clear();
  }

  /** Expose number of active connections for monitoring */
  getActiveConnectionCount(): number {
    return this.connections.size;
  }
}
