import {
  Controller,
  Post,
  Body,
  Get,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { RegisterDto, LoginDto, RefreshTokenDto, SetupPasswordDto } from './dto/auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refreshToken);
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'))
  async getProfile(@Request() req: any) {
    return this.authService.getProfile(req.user.userId, req.user.tenantDbName, req.user.companyId);
  }

  @Post('setup-password')
  @UseGuards(AuthGuard('jwt'))
  async setupPassword(@Request() req: any, @Body() dto: SetupPasswordDto) {
    return this.authService.setupPassword(req.user.userId, req.user.tenantDbName, dto);
  }

  @Post('complete-tour')
  @UseGuards(AuthGuard('jwt'))
  async completeTour(@Request() req: any) {
    return this.authService.completeTour(req.user.userId, req.user.tenantDbName);
  }
}
