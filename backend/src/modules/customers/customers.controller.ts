import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, RequirePermissions } from '../../guards/roles.guard';
import { CustomersService } from './customers.service';
import { CreateCustomerDto, UpdateCustomerDto } from './dto/customer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('customers')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Post() @RequirePermissions('customer.create')
  create(@Request() req: any, @Body() dto: CreateCustomerDto) { return this.customersService.create(req.user.companyId, dto); }

  @Get() @RequirePermissions('customer.view')
  findAll(@Request() req: any, @Query() query: PaginationDto) { return this.customersService.findAll(req.user.companyId, query); }

  @Get(':id') @RequirePermissions('customer.view')
  findOne(@Request() req: any, @Param('id') id: string) { return this.customersService.findOne(req.user.companyId, id); }

  @Put(':id') @RequirePermissions('customer.update')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateCustomerDto) { return this.customersService.update(req.user.companyId, id, dto); }

  @Delete(':id') @RequirePermissions('customer.delete')
  remove(@Request() req: any, @Param('id') id: string) { return this.customersService.remove(req.user.companyId, id); }
}
