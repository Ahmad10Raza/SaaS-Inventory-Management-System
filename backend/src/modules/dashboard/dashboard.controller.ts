import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, RequirePermissions } from '../../guards/roles.guard';
import { DashboardService } from './dashboard.service';

@Controller('dashboard')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('overview') @RequirePermissions('dashboard.read')
  getOverview(@Request() req: any) {
    return this.dashboardService.getOverview(req.user.companyId);
  }

  @Get('sales-chart') @RequirePermissions('dashboard.read')
  getSalesChart(@Request() req: any) {
    return this.dashboardService.getSalesChart(req.user.companyId);
  }

  @Get('top-products') @RequirePermissions('dashboard.read')
  getTopProducts(@Request() req: any) {
    return this.dashboardService.getTopProducts(req.user.companyId);
  }

  @Get('recent-activity') @RequirePermissions('dashboard.read')
  getRecentActivity(@Request() req: any) {
    return this.dashboardService.getRecentActivity(req.user.companyId);
  }

  @Get('stock-distribution') @RequirePermissions('dashboard.read')
  getStockDistribution(@Request() req: any) {
    return this.dashboardService.getStockDistribution(req.user.companyId);
  }

  @Get('business-metrics') @RequirePermissions('dashboard.read')
  getBusinessMetrics(@Request() req: any) {
    return this.dashboardService.getBusinessMetrics(req.user.companyId);
  }
}
