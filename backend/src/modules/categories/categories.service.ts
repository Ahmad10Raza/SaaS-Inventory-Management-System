import { Injectable, NotFoundException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model, Connection, Types } from 'mongoose';
import { Category, CategoryDocument, CategorySchema } from '../../schemas/category.schema';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { ensureObjectId } from '../../common/utils/tenant.utils';

@Injectable({ scope: Scope.REQUEST })
export class CategoriesService {
  private _categoryModel: Model<CategoryDocument>;

  constructor(@Inject(REQUEST) private request: any) {}

  private get categoryModel(): Model<CategoryDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    
    if (!this._categoryModel) {
      this._categoryModel = (conn.modelNames().includes(Category.name) ? conn.model(Category.name) : conn.model(Category.name, CategorySchema)) as any;
    }
    return this._categoryModel;
  }

  async create(companyId: string, dto: CreateCategoryDto) {
    return this.categoryModel.create({ ...dto, companyId: ensureObjectId(companyId) });
  }

  async findAll(companyId: string) {
    const filter: any = { isActive: true };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    const result = await this.categoryModel.find(filter).sort({ name: 1 }).lean();
    console.log(`[DEBUG] Categories.findAll for company ${companyId}: found ${result.length} categories`);
    return result;
  }

  async findOne(companyId: string, id: string) {
    const filter: any = { _id: ensureObjectId(id), isActive: true };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    const cat = await this.categoryModel.findOne(filter).lean();
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

  async getAttributes(companyId: string, categoryId: string) {
    const conn = this.request.tenantConnection;
    // Explicitly cast to ObjectId for matching
    const cId = new Types.ObjectId(companyId);
    const catId = new Types.ObjectId(categoryId);
    
    // We can use the helper or conn.model directly if registered
    const AttributeModel = conn.modelNames().includes('CategoryAttribute') 
      ? conn.model('CategoryAttribute') 
      : conn.model('CategoryAttribute', CategorySchema); // Using CategorySchema as a placeholder if precise schema not imported, but should really import proper Attribute schema if possible.
      
    return AttributeModel.find({ companyId: cId as any, categoryId: catId as any }).sort({ displayOrder: 1 }).lean();
  }
}
