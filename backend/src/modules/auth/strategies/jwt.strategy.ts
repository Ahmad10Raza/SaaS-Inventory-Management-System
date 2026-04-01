import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('jwt.secret') || 'default_jwt_secret',
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.companyId || !payload.tenantDbName) {
      throw new UnauthorizedException('Invalid token structure');
    }
    return {
      userId: payload.sub,
      email: payload.email,
      companyId: payload.companyId,
      tenantDbName: payload.tenantDbName,
      role: payload.role,
      isTemporaryPassword: payload.isTemporaryPassword || false,
    };
  }
}
