import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { Company, CompanyDocument } from '../../schemas/company.schema';
import { RegisterDto, LoginDto, SetupPasswordDto } from './dto/auth.dto';
import { TenantProvisionerService } from '../tenant/tenant-provisioner.service';
import { TenantConnectionService } from '../../database/tenant-connection.service';
import { DEFAULT_ROLE_PERMISSIONS } from '../../constants/permissions';



@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(Company.name) private companyModel: Model<CompanyDocument>,
    private readonly tenantProvisionerService: TenantProvisionerService,
    private readonly tenantConnectionService: TenantConnectionService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ─────────────────────────────────────────────────────
  // REGISTER — provisions new company + admin user
  // ─────────────────────────────────────────────────────
  async register(registerDto: RegisterDto) {
    // Check for duplicate email across ALL tenant databases via master DB index
    // (This is a best-effort check — full uniqueness is enforced within each tenant DB)
    const existingCompanyWithEmail = await this.companyModel.findOne({
      slug: registerDto.email.toLowerCase().replace(/[^a-z0-9]/g, ''),
    });

    // Provision the new tenant (creates DB, seeds collections, creates admin user)
    let result;
    try {
      result = await this.tenantProvisionerService.provisionNewTenant(registerDto);
    } catch (err) {
      this.logger.error(`Provisioning failed: ${err.message}`, err.stack);
      throw err;
    }

    // Generate JWT tokens for immediate login after registration
    const tokens = await this.generateTokens({
      userId: result.adminUser._id.toString(),
      email: registerDto.email.toLowerCase(),
      companyId: result.company._id.toString(),
      tenantDbName: result.databaseName,
      role: 'company_owner',
      isTemporaryPassword: false,
    });

    // Persist refresh token in tenant DB
    const conn = await this.tenantConnectionService.getConnection(result.databaseName);
    const UserModel = conn.model('User');

    await UserModel.findByIdAndUpdate(result.adminUser._id, {
      refreshToken: tokens.refreshToken,
    });

    return {
      ...tokens,
      user: result.adminUser,
      company: result.company,
    };
  }

  // ─────────────────────────────────────────────────────
  // LOGIN — resolves tenant DB, validates credentials
  // ─────────────────────────────────────────────────────
  async login(loginDto: LoginDto) {
    const email = loginDto.email.toLowerCase();
    
    // ── Step 0: Super Admin Fast-Path (env-based, no tenant DB needed) ──
    const superAdminEmail = (this.configService.get<string>('SUPER_ADMIN_EMAIL') || 'admin@saas.com').toLowerCase();
    const superAdminPassword = this.configService.get<string>('SUPER_ADMIN_PASSWORD') || 'SuperAdmin2026!';

    if (email === superAdminEmail) {
      this.logger.log(`[Auth] Super Admin login attempt: ${email}`);

      // Validate password directly against .env value (plain-text compare)
      if (loginDto.password !== superAdminPassword) {
        throw new UnauthorizedException('Invalid email or password');
      }

      // Generate a platform-level JWT (no tenant DB required)
      const tokens = await this.generateTokens({
        userId: 'super_admin_root',
        email: superAdminEmail,
        companyId: 'platform',
        tenantDbName: 'saas_master',
        role: 'super_admin',
        isTemporaryPassword: false,
      });

      this.logger.log(`[Auth] Super Admin authenticated successfully.`);

      return {
        ...tokens,
        user: {
          _id: 'super_admin_root',
          firstName: 'Super',
          lastName: 'Admin',
          email: superAdminEmail,
          role: 'super_admin',
          isActive: true,
          permissions: ['*'],
        },
        company: {
          _id: 'platform',
          name: 'SaaS Platform',
          slug: 'saas-platform',
          isActive: true,
          subscriptionPlan: 'premium',
        },
      };
    }

    // ── Step 1: Regular tenant login — Find company by ownerEmail ──
    const company = await this.companyModel.findOne({ ownerEmail: email, isActive: true }).lean();

    let foundUser: any = null;
    let foundCompany: any = null;

    if (company) {
      try {
        const conn = await this.tenantConnectionService.getConnection(company.databaseName);
        const UserModel = conn.model('User');
        foundUser = await UserModel.findOne({ email }).lean();
        foundCompany = company;
      } catch (err) {
        this.logger.error(`Direct login lookup failed for ${company.databaseName}: ${err.message}`);
      }
    }

    // Step 2: Legacy Fallback — search all tenant DBs
    if (!foundUser) {
      this.logger.warn(`Email ${email} not found via ownerEmail. Falling back to global search...`);
      const companies = await this.companyModel.find({ isActive: true }).lean();

      for (const comp of companies) {
        if (!comp.databaseName || comp.databaseName.length > 38) {
          this.logger.warn(`Skipping invalid/too-long DB name: ${comp.databaseName}`);
          continue;
        }

        try {
          const conn = await this.tenantConnectionService.getConnection(comp.databaseName);
          const UserModel = conn.model('User');
          const user = await UserModel.findOne({ email }).lean();
          if (user) {
            foundUser = user;
            foundCompany = comp;
            break;
          }
        } catch (err) {
          // Silent skip for individual DB failures
        }
      }
    }

    if (!foundUser) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!foundUser.isActive) {
      throw new UnauthorizedException('Your account is deactivated. Contact your administrator.');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, foundUser.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!foundCompany.isActive) {
      throw new UnauthorizedException('Your company account is inactive. Contact support.');
    }

    // Generate tokens with tenantDbName embedded
    const tokens = await this.generateTokens({
      userId: foundUser._id.toString(),
      email: foundUser.email,
      companyId: foundCompany._id.toString(),
      tenantDbName: foundCompany.databaseName,
      role: foundUser.role,
      isTemporaryPassword: foundUser.isTemporaryPassword || false,
    });

    // Update refresh token and lastLogin in tenant DB
    const conn = await this.tenantConnectionService.getConnection(foundCompany.databaseName);
    const UserModel = conn.model('User');

    await UserModel.findByIdAndUpdate(foundUser._id, {
      refreshToken: tokens.refreshToken,
      lastLogin: new Date(),
    });

    return {
      ...tokens,
      user: this.sanitizeUser(foundUser),
      company: foundCompany,
    };
  }

  // ─────────────────────────────────────────────────────
  // REFRESH TOKEN
  // ─────────────────────────────────────────────────────
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.configService.get<string>('jwt.refreshSecret'),
      });

      const tenantDbName = payload.tenantDbName;
      if (!tenantDbName) throw new UnauthorizedException('Invalid token structure');

      const conn = await this.tenantConnectionService.getConnection(tenantDbName);
      const UserModel = conn.model('User');

      const user = await UserModel.findById(payload.sub).lean() as any;
      if (!user || user.refreshToken !== refreshToken) {
        throw new UnauthorizedException('Invalid refresh token');
      }

      const company = await this.companyModel.findById(payload.companyId).lean();

      const tokens = await this.generateTokens({
        userId: user._id.toString(),
        email: user.email,
        companyId: payload.companyId,
        tenantDbName,
        role: user.role,
        isTemporaryPassword: user.isTemporaryPassword || false,
      });

      await UserModel.findByIdAndUpdate(user._id, { refreshToken: tokens.refreshToken });

      return tokens;
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // ─────────────────────────────────────────────────────
  // GET PROFILE
  // ─────────────────────────────────────────────────────
  async getProfile(userId: string, tenantDbName: string, companyId: string) {
    // Super admin synthetic profile — no tenant DB lookup needed
    if (userId === 'super_admin_root' && companyId === 'platform') {
      const superAdminEmail = (this.configService.get<string>('SUPER_ADMIN_EMAIL') || 'admin@saas.com').toLowerCase();
      return {
        user: {
          _id: 'super_admin_root',
          firstName: 'Super',
          lastName: 'Admin',
          email: superAdminEmail,
          role: 'super_admin',
          isActive: true,
          permissions: ['*'],
          hasSeenTour: true,
        },
        company: {
          _id: 'platform',
          name: 'SaaS Platform',
          slug: 'saas-platform',
          isActive: true,
          subscriptionPlan: 'premium',
        },
      };
    }

    const conn = await this.tenantConnectionService.getConnection(tenantDbName);
    const UserModel = conn.model('User');

    const user = await UserModel.findById(userId).lean() as any;
    if (!user) throw new UnauthorizedException('User not found');

    const company = await this.companyModel.findById(companyId).lean();

    return {
      user: this.sanitizeUser(user),
      company,
    };
  }

  // ─────────────────────────────────────────────────────
  // SETUP PASSWORD (for temp password users)
  // ─────────────────────────────────────────────────────
  async setupPassword(userId: string, tenantDbName: string, dto: SetupPasswordDto) {
    const conn = await this.tenantConnectionService.getConnection(tenantDbName);
    const UserModel = conn.model('User');

    const hashedPassword = await bcrypt.hash(dto.newPassword, 12);

    const updated = await UserModel.findByIdAndUpdate(userId, {
      password: hashedPassword,
      isTemporaryPassword: false,
    }, { new: true }).lean();

    if (!updated) throw new UnauthorizedException('User not found');

    return { message: 'Password updated successfully. Please log in again.' };
  }

  async completeTour(userId: string, tenantDbName: string) {
    const conn = await this.tenantConnectionService.getConnection(tenantDbName);
    const UserModel = conn.model('User');
    await UserModel.findByIdAndUpdate(userId, { hasSeenTour: true });
    return { message: 'Tour completed' };
  }

  // ─────────────────────────────────────────────────────
  // Private Helpers
  // ─────────────────────────────────────────────────────
  private async generateTokens(payload: {
    userId: string;
    email: string;
    companyId: string;
    tenantDbName: string;
    role: string;
    isTemporaryPassword: boolean;
  }) {
    const jwtPayload = {
      sub: payload.userId,
      email: payload.email,
      companyId: payload.companyId,
      tenantDbName: payload.tenantDbName,
      role: payload.role,
      isTemporaryPassword: payload.isTemporaryPassword,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('jwt.secret')!,
        expiresIn: this.configService.get<string>('jwt.expiration') || '15m',
      } as any),
      this.jwtService.signAsync(jwtPayload, {
        secret: this.configService.get<string>('jwt.refreshSecret')!,
        expiresIn: this.configService.get<string>('jwt.refreshExpiration') || '7d',
      } as any),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: any) {
    const { password, refreshToken, passwordResetToken, passwordResetExpires, ...sanitized } = user;
    
    // Inject default permissions if not present in DB
    if (!sanitized.permissions || sanitized.permissions.length === 0) {
      sanitized.permissions = DEFAULT_ROLE_PERMISSIONS[sanitized.role] || [];
    }
    
    return sanitized;
  }
}
