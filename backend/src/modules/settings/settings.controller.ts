import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, RequirePermissions } from '../../guards/roles.guard';
import { SettingsService } from './settings.service';
import { UpdateCompanyDto, CreateUserDto, UpdateUserDto } from './dto/settings.dto';

@Controller('settings')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ═══════════════════════════════════════════════════════
  // Company Profile
  // ═══════════════════════════════════════════════════════

  @Get('company') @RequirePermissions('settings.read')
  getCompanyProfile(@Request() req: any) {
    return this.settingsService.getCompanyProfile(req.user.companyId);
  }

  @Put('company') @RequirePermissions('settings.write')
  updateCompanyProfile(@Request() req: any, @Body() dto: UpdateCompanyDto) {
    return this.settingsService.updateCompanyProfile(req.user.companyId, dto);
  }

  // ═══════════════════════════════════════════════════════
  // Users / Staff
  // ═══════════════════════════════════════════════════════

  @Get('users') @RequirePermissions('users.read')
  getUsers(@Request() req: any) {
    return this.settingsService.getUsers(req.user.companyId);
  }

  @Post('users') @RequirePermissions('users.write')
  createUser(@Request() req: any, @Body() dto: CreateUserDto) {
    return this.settingsService.createUser(req.user.companyId, dto);
  }

  @Put('users/:id') @RequirePermissions('users.update')
  updateUser(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateUserDto) {
    return this.settingsService.updateUser(req.user.companyId, id, dto);
  }

  @Delete('users/:id') @RequirePermissions('users.delete')
  deleteUser(@Request() req: any, @Param('id') id: string) {
    return this.settingsService.deleteUser(req.user.companyId, id, req.user.userId);
  }

  // ═══════════════════════════════════════════════════════
  // Industry-Aware Settings (7 setting types)
  // ═══════════════════════════════════════════════════════

  // ── Industry Settings ──────────────────────────────────
  @Get('industry') @RequirePermissions('settings.read')
  getIndustrySettings(@Request() req: any) {
    return this.settingsService.getIndustrySettings(req.user.companyId);
  }
  @Put('industry') @RequirePermissions('settings.write')
  updateIndustrySettings(@Request() req: any, @Body() dto: any) {
    return this.settingsService.updateIndustrySettings(req.user.companyId, dto);
  }

  // ── Inventory Settings ─────────────────────────────────
  @Get('inventory') @RequirePermissions('settings.read')
  getInventorySettings(@Request() req: any) {
    return this.settingsService.getInventorySettings(req.user.companyId);
  }
  @Put('inventory') @RequirePermissions('settings.write')
  updateInventorySettings(@Request() req: any, @Body() dto: any) {
    return this.settingsService.updateInventorySettings(req.user.companyId, dto);
  }

  // ── Product Settings ───────────────────────────────────
  @Get('products') @RequirePermissions('settings.read')
  getProductSettings(@Request() req: any) {
    return this.settingsService.getProductSettings(req.user.companyId);
  }
  @Put('products') @RequirePermissions('settings.write')
  updateProductSettings(@Request() req: any, @Body() dto: any) {
    return this.settingsService.updateProductSettings(req.user.companyId, dto);
  }

  // ── Tax & Billing Settings ─────────────────────────────
  @Get('tax') @RequirePermissions('settings.read')
  getTaxSettings(@Request() req: any) {
    return this.settingsService.getTaxSettings(req.user.companyId);
  }
  @Put('tax') @RequirePermissions('settings.write')
  updateTaxSettings(@Request() req: any, @Body() dto: any) {
    return this.settingsService.updateTaxSettings(req.user.companyId, dto);
  }

  // ── Warehouse Config ───────────────────────────────────
  @Get('warehouse') @RequirePermissions('settings.read')
  getWarehouseConfig(@Request() req: any) {
    return this.settingsService.getWarehouseConfig(req.user.companyId);
  }
  @Put('warehouse') @RequirePermissions('settings.write')
  updateWarehouseConfig(@Request() req: any, @Body() dto: any) {
    return this.settingsService.updateWarehouseConfig(req.user.companyId, dto);
  }

  // ── Approval Settings ──────────────────────────────────
  @Get('approvals') @RequirePermissions('settings.read')
  getApprovalSettings(@Request() req: any) {
    return this.settingsService.getApprovalSettings(req.user.companyId);
  }
  @Put('approvals') @RequirePermissions('settings.write')
  updateApprovalSettings(@Request() req: any, @Body() dto: any) {
    return this.settingsService.updateApprovalSettings(req.user.companyId, dto);
  }

  // ── Notification Config ────────────────────────────────
  @Get('notifications') @RequirePermissions('settings.read')
  getNotificationConfig(@Request() req: any) {
    return this.settingsService.getNotificationConfig(req.user.companyId);
  }
  @Put('notifications') @RequirePermissions('settings.write')
  updateNotificationConfig(@Request() req: any, @Body() dto: any) {
    return this.settingsService.updateNotificationConfig(req.user.companyId, dto);
  }

  // ── Branding Settings ──────────────────────────────────
  @Get('branding') @RequirePermissions('settings.read')
  getBrandingSettings(@Request() req: any) {
    return this.settingsService.getBrandingSettings(req.user.companyId);
  }
  @Put('branding') @RequirePermissions('settings.write')
  updateBrandingSettings(@Request() req: any, @Body() dto: any) {
    return this.settingsService.updateBrandingSettings(req.user.companyId, dto);
  }
}
