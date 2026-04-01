import { Module, MiddlewareConsumer, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';

import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';

import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CustomersModule } from './modules/customers/customers.module';
import { VendorsModule } from './modules/vendors/vendors.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { SalesModule } from './modules/sales/sales.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SettingsModule } from './modules/settings/settings.module';
import { EmailModule } from './modules/email/email.module';
import { AdminModule } from './modules/admin/admin.module';

import { Company, CompanySchema } from './schemas/company.schema';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { DatabaseModule } from './database/database.module';
import { TenantModule } from './modules/tenant/tenant.module';
import { TenantResolverMiddleware } from './middleware/tenant-resolver.middleware';

@Module({
  imports: [
    // Config
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
    }),

    // MongoDB — connect to master DB only
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const baseUri = configService.get<string>('database.uri')!;
        const masterDb = configService.get<string>('database.masterDbName') || 'saas_master';
        // Build URI: baseUri/masterDbName?retryWrites=true&w=majority
        return {
          uri: `${baseUri}/${masterDb}?retryWrites=true&w=majority`,
        };
      },
    }),

    // Rate Limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Register MASTER schemas globally
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
      { name: Subscription.name, schema: SubscriptionSchema },
      // Other global schemas like global_settings or super_admins can go here
    ]),

    // Core Architecture Modules
    DatabaseModule,
    TenantModule,

    // Feature modules
    AuthModule,
    ProductsModule,
    CategoriesModule,
    CustomersModule,
    VendorsModule,
    WarehousesModule,
    InventoryModule,
    PurchasesModule,
    SalesModule,
    DashboardModule,
    ReportsModule,
    SettingsModule,
    EmailModule,
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    // Apply the tenant resolver middleware to all routes except the root auth ones if desired,
    // but the middleware handles missing headers, so applying it globally is safe.
    consumer
      .apply(TenantResolverMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
