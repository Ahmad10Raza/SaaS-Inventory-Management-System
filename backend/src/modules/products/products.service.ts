import { Injectable, NotFoundException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import mongoose, { Model, Connection } from 'mongoose';
import { Product, ProductDocument, ProductSchema } from '../../schemas/product.schema';
import { ProductVariant, ProductVariantDocument, ProductVariantSchema } from '../../schemas/product-variant.schema';
import { WarehouseStock, WarehouseStockDocument, WarehouseStockSchema } from '../../schemas/warehouse-stock.schema';
import { CreateProductDto, UpdateProductDto, CreateVariantDto } from './dto/product.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ensureObjectId } from '../../common/utils/tenant.utils';

@Injectable({ scope: Scope.REQUEST })
export class ProductsService {
  private _productModel: Model<ProductDocument>;
  private _variantModel: Model<ProductVariantDocument>;
  private _stockModel: Model<WarehouseStockDocument>;

  constructor(@Inject(REQUEST) private request: any) {}

  private get productModel(): Model<ProductDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._productModel) {
      this._productModel = (conn.modelNames().includes(Product.name) ? conn.model(Product.name) : conn.model(Product.name, ProductSchema)) as any;
    }
    return this._productModel;
  }

  private get variantModel(): Model<ProductVariantDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._variantModel) {
      this._variantModel = (conn.modelNames().includes(ProductVariant.name) ? conn.model(ProductVariant.name) : conn.model(ProductVariant.name, ProductVariantSchema)) as any;
    }
    return this._variantModel;
  }

  private get stockModel(): Model<WarehouseStockDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._stockModel) {
      this._stockModel = (conn.modelNames().includes(WarehouseStock.name) ? conn.model(WarehouseStock.name) : conn.model(WarehouseStock.name, WarehouseStockSchema)) as any;
    }
    return this._stockModel;
  }

  async create(companyId: string, userId: string, dto: CreateProductDto) {
    const cId = ensureObjectId(companyId);

    const product = await this.productModel.create({
      companyId: cId,
      name: dto.name,
      brand: dto.brand,
      description: dto.description,
      categoryId: ensureObjectId(dto.categoryId),
      taxPercentage: dto.taxPercentage,
      images: dto.images,
      minSellingPrice: dto.minSellingPrice,
      dynamicAttributes: dto.dynamicAttributes,
    });

    try {
      // Automatically create the initial default variant
      const variantPayload = {
        productId: product._id,
        companyId: cId,
        name: `${dto.name} (Default)`,
        sku: dto.sku,
        barcode: dto.barcode,
        price: dto.price,
        costPrice: dto.costPrice,
        unit: dto.unit || 'piece',
        isDefault: true,
        isActive: true,
      };

      await this.variantModel.create(variantPayload);
      return product;
    } catch (error) {
      // Rollback: delete product if variant creation fails to prevent orphaned products
      await this.productModel.deleteOne({ _id: product._id });
      throw error;
    }
  }

  async findAll(companyId: string, query: PaginationDto) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const pageNum = Number(page);
    const limitNum = Number(limit);
    const filter: any = { isActive: true };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    // Standard ERP aggregation: Product + Sum(WarehouseStock)
    try {
      console.log(`[DEBUG] Products.findAll filter:`, JSON.stringify(filter));
      const [data, total] = await Promise.all([
        this.productModel.aggregate([
          { $match: filter },
          {
            $lookup: {
              from: 'product_variants',
              localField: '_id',
              foreignField: 'productId',
              as: 'variants',
            },
          },
          {
            $lookup: {
              from: 'warehouse_stock',
              let: { vIds: '$variants._id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $or: [
                        { $in: ['$variantId', '$$vIds'] },
                        {
                          $anyElementTrue: {
                            $map: {
                              input: '$$vIds',
                              as: 'vid',
                              in: { $eq: ['$variantId', { $toString: '$$vid' }] }
                            }
                          }
                        }
                      ]
                    }
                  }
                }
              ],
              as: 'allStockData',
            },
          },
          {
            $addFields: {
              totalStock: { $sum: '$allStockData.totalQuantity' },
              availableStock: { $sum: '$allStockData.availableQuantity' },
            },
          },
          { $sort: { [sortBy]: sortOrder === 'asc' ? 1 : -1 } },
          { $skip: (pageNum - 1) * limitNum },
          { $limit: limitNum },
        ]),
        this.productModel.countDocuments(filter),
      ]);
      console.log(`[DEBUG] Products.findAll result: found ${data.length} products (total: ${total})`);
      return { data, total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) };
    } catch (error: any) {
      console.error("[ProductsService.findAll] Error:", error);
      throw error;
    }
  }

  async findOne(companyId: string, id: string) {
    const filter: any = { _id: ensureObjectId(id), isActive: true };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    const product = await this.productModel.findOne(filter).lean();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async update(companyId: string, id: string, dto: UpdateProductDto) {
    const { sku, barcode, price, costPrice, unit, ...productDto } = dto;
    
    const filter: any = { _id: ensureObjectId(id) };
    if (companyId) {
      filter.companyId = { $in: [companyId, ensureObjectId(companyId)] };
    }
    
    const product = await this.productModel.findOneAndUpdate(
      filter,
      { $set: productDto },
      { new: true },
    );
    if (!product) throw new NotFoundException('Product not found');

    if (sku !== undefined || price !== undefined || costPrice !== undefined || unit !== undefined || barcode !== undefined) {
      const variantPayload: any = {};
      if (sku !== undefined) variantPayload.sku = sku;
      if (barcode !== undefined) variantPayload.barcode = barcode;
      if (price !== undefined) variantPayload.price = price;
      if (costPrice !== undefined) variantPayload.costPrice = costPrice;
      if (unit !== undefined) variantPayload.unit = unit;

      await this.variantModel.findOneAndUpdate(
        { productId: (product._id as any), companyId }, // Update first variant
        { $set: variantPayload }
      );
    }

    return product;
  }

  async remove(companyId: string, id: string) {
    const product = await this.productModel.findOneAndUpdate(
      { 
        _id: ensureObjectId(id), 
        companyId: { $in: [companyId, ensureObjectId(companyId)] } 
      },
      { $set: { isActive: false } },
      { new: true },
    );
    if (!product) throw new NotFoundException('Product not found');

    // Cascade soft-delete to all variants
    await this.variantModel.updateMany({ productId: product._id as any, companyId }, { $set: { isActive: false } });

    return { message: 'Product deactivated successfully' };
  }

  async getLowStock(companyId: string) {
    return this.stockModel.aggregate([
      { $match: { companyId, $expr: { $lte: ['$totalQuantity', '$reorderLevel'] } } },
      {
        $lookup: {
          from: 'product_variants',
          localField: 'variantId',
          foreignField: '_id',
          as: 'variant',
        },
      },
      { $unwind: '$variant' },
      {
        $lookup: {
          from: 'products',
          localField: 'variant.productId',
          foreignField: '_id',
          as: 'product',
        },
      },
      { $unwind: '$product' },
    ]);
  }
}
