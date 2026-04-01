import { Global, Module } from '@nestjs/common';
import { TenantConnectionService } from './tenant-connection.service';

/**
 * DatabaseModule
 *
 * Globally exported so TenantConnectionService is available
 * across all feature modules without re-importing.
 */
@Global()
@Module({
  providers: [TenantConnectionService],
  exports: [TenantConnectionService],
})
export class DatabaseModule {}
