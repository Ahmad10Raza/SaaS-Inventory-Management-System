import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SuperAdminGuard } from '../../guards/super-admin.guard';
import { AdminService } from './admin.service';
import { UpdateCompanyStatusDto, CompanyFilterDto, CreateCompanyDto, UpdateCompanyPlanDto } from './dto/admin.dto';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), SuperAdminGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** GET /api/admin/stats — Platform-wide statistics */
  @Get('stats')
  getPlatformStats() {
    return this.adminService.getPlatformStats();
  }

  /** GET /api/admin/companies — List all companies with filters */
  @Get('companies')
  listCompanies(@Query() filters: CompanyFilterDto) {
    return this.adminService.listCompanies(filters);
  }

  /** POST /api/admin/companies — Create new company & invite owner */
  @Post('companies')
  createCompany(@Body() dto: CreateCompanyDto) {
    return this.adminService.createCompany(dto);
  }

  /** GET /api/admin/companies/:id — Detailed view of a single company */
  @Get('companies/:id')
  getCompanyDetails(@Param('id') id: string) {
    return this.adminService.getCompanyDetails(id);
  }

  /** PUT /api/admin/companies/:id/status — Activate or deactivate a company */
  @Put('companies/:id/status')
  updateCompanyStatus(@Param('id') id: string, @Body() dto: UpdateCompanyStatusDto) {
    return this.adminService.updateCompanyStatus(id, dto);
  }

  /** PUT /api/admin/companies/:id/plan — Manual plan change */
  @Put('companies/:id/plan')
  updateCompanyPlan(@Param('id') id: string, @Body() dto: UpdateCompanyPlanDto) {
    return this.adminService.updateCompanyPlan(id, dto);
  }

  /** DELETE /api/admin/companies/:id — Delete a deactivated company */
  @Delete('companies/:id')
  deleteCompany(@Param('id') id: string) {
    return this.adminService.deleteCompany(id);
  }
}
