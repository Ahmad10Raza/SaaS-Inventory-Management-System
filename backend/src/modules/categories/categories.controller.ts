import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard, RequirePermissions } from '../../guards/roles.guard';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Controller('categories')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Post() @RequirePermissions('categories.write')
  create(@Request() req: any, @Body() dto: CreateCategoryDto) { return this.categoriesService.create(req.user.companyId, dto); }

  @Get() @RequirePermissions('categories.read')
  findAll(@Request() req: any) { return this.categoriesService.findAll(req.user.companyId); }

  @Get(':id') @RequirePermissions('categories.read')
  findOne(@Request() req: any, @Param('id') id: string) { return this.categoriesService.findOne(req.user.companyId, id); }

  @Put(':id') @RequirePermissions('categories.update')
  update(@Request() req: any, @Param('id') id: string, @Body() dto: UpdateCategoryDto) { return this.categoriesService.update(req.user.companyId, id, dto); }

  @Delete(':id') @RequirePermissions('categories.delete')
  remove(@Request() req: any, @Param('id') id: string) { return this.categoriesService.remove(req.user.companyId, id); }

  @Get(':id/attributes') @RequirePermissions('categories.read')
  getAttributes(@Request() req: any, @Param('id') id: string) { return this.categoriesService.getAttributes(req.user.companyId, id); }
}
