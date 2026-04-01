import { Injectable, NotFoundException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model, Connection } from 'mongoose';
import { Category, CategoryDocument, CategorySchema } from '../../schemas/category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';

@Injectable({ scope: Scope.REQUEST })
export class CategoriesService {
  private categoryModel: Model<CategoryDocument>;

  constructor(@Inject(REQUEST) private request: any) {
    const conn = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    
    this.categoryModel = conn.modelNames().includes(Category.name) ? conn.model<any>(Category.name) as any : conn.model<any>(Category.name, CategorySchema) as any;
  }

  async create(companyId: string, dto: CreateCategoryDto) {
    return this.categoryModel.create({ ...dto, companyId });
  }

  async findAll(companyId: string) {
    return this.categoryModel.find({ companyId, isActive: true }).sort({ name: 1 }).lean();
  }

  async findOne(companyId: string, id: string) {
    const cat = await this.categoryModel.findOne({ _id: id, companyId }).lean();
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async update(companyId: string, id: string, dto: UpdateCategoryDto) {
    const cat = await this.categoryModel.findOneAndUpdate({ _id: id, companyId }, { $set: dto }, { new: true });
    if (!cat) throw new NotFoundException('Category not found');
    return cat;
  }

  async remove(companyId: string, id: string) {
    const cat = await this.categoryModel.findOneAndUpdate({ _id: id, companyId }, { $set: { isActive: false } }, { new: true });
    if (!cat) throw new NotFoundException('Category not found');
    return { message: 'Category deactivated' };
  }
}
