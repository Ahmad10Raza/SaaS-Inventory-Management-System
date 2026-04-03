import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, RequirePermissions } from '../../guards/roles.guard';
import { InventoryService } from './inventory.service';
import { StockInDto, StockOutDto, StockAdjustDto, StockTransferDto } from './dto/inventory.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ValidationService } from './validation.service';

@Controller('inventory')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class InventoryController {
  constructor(
    private readonly inventoryService: InventoryService,
    private readonly validationService: ValidationService
  ) {}

  @Get('validate')
  @RequirePermissions('inventory.view')
  validateInventory(@Request() req: any) {
    return this.validationService.validateTenantWorkflow(req.user.companyId);
  }

  @Get()
  @RequirePermissions('inventory.view')
  getStock(@Request() req: any, @Query() query: PaginationDto) {
    return this.inventoryService.getStock(req.user.companyId, query);
  }

  @Post('stock-in')
  @RequirePermissions('inventory.add_stock')
  stockIn(@Request() req: any, @Body() dto: StockInDto) {
    return this.inventoryService.stockIn(req.user.companyId, req.user.userId, dto);
  }

  @Post('stock-out')
  @RequirePermissions('inventory.reduce_stock')
  stockOut(@Request() req: any, @Body() dto: StockOutDto) {
    return this.inventoryService.stockOut(req.user.companyId, req.user.userId, dto);
  }

  @Post('adjust')
  @RequirePermissions('inventory.adjust')
  stockAdjust(@Request() req: any, @Body() dto: StockAdjustDto) {
    return this.inventoryService.stockAdjust(req.user.companyId, req.user.userId, dto);
  }

  @Post('transfer')
  @RequirePermissions('inventory.transfer_stock')
  stockTransfer(@Request() req: any, @Body() dto: StockTransferDto) {
    return this.inventoryService.stockTransfer(req.user.companyId, req.user.userId, dto);
  }

  @Get('logs')
  @RequirePermissions('inventory.view')
  getStockLogs(@Request() req: any, @Query() query: PaginationDto & { productId?: string }) {
    return this.inventoryService.getStockLogs(req.user.companyId, query);
  }
}
