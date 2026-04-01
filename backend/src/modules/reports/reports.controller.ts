import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, RequirePermissions } from '../../guards/roles.guard';
import { ReportsService } from './reports.service';
import type { ReportFilterDto } from './reports.service';

@Controller('reports')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('sales') @RequirePermissions('reports.view')
  getSales(@Request() req: any, @Query() filters: ReportFilterDto) {
    return this.reportsService.getSalesReport(req.user.companyId, filters);
  }

  @Get('purchases') @RequirePermissions('reports.view')
  getPurchases(@Request() req: any, @Query() filters: ReportFilterDto) {
    return this.reportsService.getPurchasesReport(req.user.companyId, filters);
  }

  @Get('inventory') @RequirePermissions('reports.view')
  getInventory(@Request() req: any) {
    return this.reportsService.getInventoryReport(req.user.companyId);
  }

  @Get('stock-logs') @RequirePermissions('reports.view')
  getStockLogs(@Request() req: any, @Query() filters: ReportFilterDto) {
    return this.reportsService.getStockLogsReport(req.user.companyId, filters);
  }
}
