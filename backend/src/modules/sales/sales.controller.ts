import { Controller, Get, Post, Body, Param, Query, UseGuards, Request, Put } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, RequirePermissions } from '../../guards/roles.guard';
import { SalesService } from './sales.service';
import { CreateSaleDto, SalePaymentDto } from './dto/sale.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('sales')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class SalesController {
  constructor(private readonly salesService: SalesService) {}

  @Post() @RequirePermissions('sales.create')
  create(@Request() req: any, @Body() dto: CreateSaleDto) {
    return this.salesService.create(req.user.companyId, req.user.userId, dto);
  }

  @Get() @RequirePermissions('sales.view')
  findAll(@Request() req: any, @Query() query: PaginationDto & { status?: string }) {
    return this.salesService.findAll(req.user.companyId, query);
  }

  @Get('stats') @RequirePermissions('sales.view')
  getStats(@Request() req: any) {
    return this.salesService.getStats(req.user.companyId);
  }

  @Get(':id') @RequirePermissions('sales.view')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.salesService.findOne(req.user.companyId, id);
  }

  @Get('invoice/:invoiceId') @RequirePermissions('sales.view')
  getInvoice(@Request() req: any, @Param('invoiceId') invoiceId: string) {
    return this.salesService.getInvoice(req.user.companyId, invoiceId);
  }

  @Put(':id/status') @RequirePermissions('sales.update')
  updateStatus(@Request() req: any, @Param('id') id: string, @Body('status') status: string) {
    return this.salesService.updateStatus(req.user.companyId, id, req.user.userId, status);
  }

  @Post(':id/payment') @RequirePermissions('sales.pay')
  recordPayment(@Request() req: any, @Param('id') id: string, @Body() dto: SalePaymentDto) {
    return this.salesService.recordPayment(req.user.companyId, id, dto);
  }
}
