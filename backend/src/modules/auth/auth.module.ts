import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { Company, CompanySchema } from '../../schemas/company.schema';
import { TenantModule } from '../tenant/tenant.module';
import { DatabaseModule } from '../../database/database.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('jwt.secret') || 'default_jwt_secret',
        signOptions: {
          expiresIn: configService.get<string>('jwt.expiration') || '15m',
        },
      } as any),
    }),
    MongooseModule.forFeature([
      { name: Company.name, schema: CompanySchema },
    ]),
    TenantModule,
    DatabaseModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtStrategy, PassportModule],
})
export class AuthModule {}
