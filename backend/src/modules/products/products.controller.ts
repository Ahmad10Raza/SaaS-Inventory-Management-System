import {
  Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, RequirePermissions } from '../../guards/roles.guard';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Controller('products')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post()
  @RequirePermissions('product.create')
  create(@Request() req: any, @Body() dto: CreateProductDto) {
    return this.productsService.create(req.user.companyId, req.user.sub, dto);
  }

  @Get()
  @RequirePermissions('product.view')
  findAll(@Request() req: any, @Query() query: PaginationDto) {
    return this.productsService.findAll(req.user.companyId, query);
  }

  @Get('low-stock')
  @RequirePermissions('product.view')
  getLowStock(@Request() req: any) {
    return this.productsService.getLowStock(req.user.companyId);
  }

  @Get(':id')
  @RequirePermissions('product.view')
  findOne(@Request() req: any, @Param('id') id: string) {
    return this.productsService.findOne(req.user.companyId, id);
  }

  @Put(':id')
  @RequirePermissions('product.update')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(req.user.companyId, id, dto);
  }

  @Delete(':id')
  @RequirePermissions('product.delete')
  remove(@Request() req: any, @Param('id') id: string) {
    return this.productsService.remove(req.user.companyId, id);
  }
}
