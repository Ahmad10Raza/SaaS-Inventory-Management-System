import { Injectable, NotFoundException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model, Connection } from 'mongoose';
import { Product, ProductDocument, ProductSchema } from '../../schemas/product.schema';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable({ scope: Scope.REQUEST })
export class ProductsService {
  private productModel: Model<ProductDocument>;

  constructor(@Inject(REQUEST) private request: any) {
    const conn = this.request.tenantConnection;
    if (!conn) {
      throw new Error('Tenant connection not found in request');
    }
    this.productModel = conn.modelNames().includes(Product.name) ? conn.model<any>(Product.name) as any : conn.model<any>(Product.name, ProductSchema) as any;
  }

  async create(companyId: string, dto: CreateProductDto) {
    return this.productModel.create({ ...dto, companyId });
  }

  async findAll(companyId: string, query: PaginationDto) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const filter: any = { companyId };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.productModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(companyId: string, id: string) {
    const product = await this.productModel.findOne({ _id: id, companyId }).lean();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(companyId: string, id: string, dto: UpdateProductDto) {
    const product = await this.productModel.findOneAndUpdate(
      { _id: id, companyId },
      { $set: dto },
      { new: true },
    );
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async remove(companyId: string, id: string) {
    const product = await this.productModel.findOneAndUpdate(
      { _id: id, companyId },
      { $set: { isActive: false } },
      { new: true },
    );
    if (!product) throw new NotFoundException('Product not found');
    return { message: 'Product deactivated successfully' };
  }

  async getLowStock(companyId: string) {
    return this.productModel.find({
      companyId,
      isActive: true,
      $expr: { $lte: ['$currentStock', '$minStockLevel'] },
    }).lean();
  }
}
