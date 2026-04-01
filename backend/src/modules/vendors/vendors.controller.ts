import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, RequirePermissions } from '../../guards/roles.guard';
import { VendorsService } from './vendors.service';
import { CreateVendorDto, UpdateVendorDto } from './dto/vendor.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('vendors')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  @Post() @RequirePermissions('vendor.create')
  create(@Request() req: any, @Body() dto: CreateVendorDto) { return this.vendorsService.create(req.user.companyId, dto); }

  @Get() @RequirePermissions('vendor.view')
  findAll(@Request() req: any, @Query() query: PaginationDto) { return this.vendorsService.findAll(req.user.companyId, query); }

  @Get(':id') @RequirePermissions('vendor.view')
  findOne(@Request() req: any, @Param('id') id: string) { return this.vendorsService.findOne(req.user.companyId, id); }

  @Put(':id') @RequirePermissions('vendor.update')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateVendorDto) { return this.vendorsService.update(req.user.companyId, id, dto); }

  @Delete(':id') @RequirePermissions('vendor.delete')
  remove(@Request() req: any, @Param('id') id: string) { return this.vendorsService.remove(req.user.companyId, id); }
}
