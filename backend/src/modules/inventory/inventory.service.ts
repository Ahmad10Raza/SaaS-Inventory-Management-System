import { Injectable, NotFoundException, BadRequestException, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Model } from 'mongoose';
import { WarehouseStock, WarehouseStockDocument, WarehouseStockSchema } from '../../schemas/warehouse-stock.schema';
import { StockMovement, StockMovementDocument, StockMovementSchema } from '../../schemas/stock-movement.schema';
import { Product, ProductDocument, ProductSchema } from '../../schemas/product.schema';
import { ProductVariant, ProductVariantDocument, ProductVariantSchema } from '../../schemas/product-variant.schema';
import { StockInDto, StockOutDto, StockAdjustDto, StockTransferDto } from './dto/inventory.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ensureObjectId } from '../../common/utils/tenant.utils';
import { Connection } from 'mongoose';

@Injectable({ scope: Scope.REQUEST })
export class InventoryService {
  private _stockModel: Model<WarehouseStockDocument>;
  private _movementModel: Model<StockMovementDocument>;
  private _productModel: Model<ProductDocument>;
  private _variantModel: Model<ProductVariantDocument>;

  constructor(@Inject(REQUEST) private request: any) {}

  private get stockModel(): Model<WarehouseStockDocument> {
    const conn: Connection = this.request.tenantConnection as any;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._stockModel) {
      this._stockModel = (conn.modelNames().includes(WarehouseStock.name) ? conn.model(WarehouseStock.name) : conn.model(WarehouseStock.name, WarehouseStockSchema)) as any;
    }
    return this._stockModel;
  }

  private get movementModel(): Model<StockMovementDocument> {
    const conn: Connection = this.request.tenantConnection as any;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._movementModel) {
      this._movementModel = (conn.modelNames().includes(StockMovement.name) ? conn.model(StockMovement.name) : conn.model(StockMovement.name, StockMovementSchema)) as any;
    }
    return this._movementModel;
  }

  private get productModel(): Model<ProductDocument> {
    const conn: Connection = this.request.tenantConnection as any;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._productModel) {
      this._productModel = (conn.modelNames().includes(Product.name) ? conn.model(Product.name) : conn.model(Product.name, ProductSchema)) as any;
    }
    return this._productModel;
  }

  private get variantModel(): Model<ProductVariantDocument> {
    const conn: Connection = this.request.tenantConnection as any;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._variantModel) {
      this._variantModel = (conn.modelNames().includes(ProductVariant.name) ? conn.model(ProductVariant.name) : conn.model(ProductVariant.name, ProductVariantSchema)) as any;
    }
    return this._variantModel;
  }

  async getStock(companyId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const filter: any = { companyId: { $in: [companyId, ensureObjectId(companyId)] } };

    const [data, total] = await Promise.all([
      this.stockModel
        .find(filter)
        .populate('productId', 'name sku')
        .populate('variantId', 'sku')
        .populate('warehouseId', 'name')
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.stockModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async stockIn(companyId: string, userId: string, dto: StockInDto) {
    const cId = ensureObjectId(companyId);
    let variantId = (dto as any).variantId;
    if (!variantId) {
       const variant = await this.variantModel.findOne({ productId: ensureObjectId(dto.productId), isDefault: true });
       if (!variant) throw new NotFoundException('Default variant not found');
       variantId = variant._id;
    } else {
       variantId = ensureObjectId(variantId);
    }

    const stockFilter = {
      companyId: { $in: [companyId, cId] },
      variantId,
      warehouseId: ensureObjectId(dto.warehouseId),
    };

    const stock = await this.stockModel.findOneAndUpdate(
      stockFilter,
      { 
        $inc: { totalQuantity: dto.quantity, availableQuantity: dto.quantity },
        $set: { companyId: cId, productId: ensureObjectId(dto.productId) },
        $setOnInsert: { reorderLevel: 10, minStockLevel: 5 }
      },
      { upsert: true, new: true }
    );

    await this.movementModel.create({
      companyId: cId,
      productId: ensureObjectId(dto.productId),
      variantId,
      warehouseId: ensureObjectId(dto.warehouseId),
      bucket: 'total',
      type: 'stock_in',
      quantity: dto.quantity,
      previousQuantity: stock.totalQuantity - dto.quantity,
      newQuantity: stock.totalQuantity,
      reference: dto.reference || 'MANUAL-IN',
      referenceType: 'adjustment',
      performedBy: ensureObjectId(userId),
      notes: dto.notes,
    });

    return stock;
  }

  async stockOut(companyId: string, userId: string, dto: StockOutDto) {
    const cId = ensureObjectId(companyId);
    let vId = (dto as any).variantId;
    if (!vId) {
       const variant = await this.variantModel.findOne({ productId: ensureObjectId(dto.productId), isDefault: true });
       if (!variant) throw new NotFoundException('Default variant not found');
       vId = variant._id;
    } else {
       vId = ensureObjectId(vId);
    }

    const stockFilter = {
      companyId: { $in: [companyId, cId] },
      variantId: vId,
      warehouseId: ensureObjectId(dto.warehouseId),
    };

    const stock = await this.stockModel.findOneAndUpdate(
      stockFilter,
      { 
        $inc: { totalQuantity: -dto.quantity, availableQuantity: -dto.quantity },
        $set: { companyId: cId, productId: ensureObjectId(dto.productId) }
      },
      { new: true }
    );
    if (!stock || stock.availableQuantity < 0) {
      // Rollback or handle error (simplified for this fix)
      throw new BadRequestException('Insufficient available stock after calculation');
    }

    await this.movementModel.create({
      companyId: cId,
      variantId: vId,
      productId: ensureObjectId(dto.productId),
      warehouseId: ensureObjectId(dto.warehouseId),
      bucket: 'total',
      type: 'stock_out',
      quantity: dto.quantity,
      previousQuantity: stock.totalQuantity + dto.quantity,
      newQuantity: stock.totalQuantity,
      reference: dto.reference || 'MANUAL-OUT',
      referenceType: 'adjustment',
      notes: dto.notes,
      performedBy: ensureObjectId(userId),
    });

    return stock;
  }

  async stockAdjust(companyId: string, userId: string, dto: StockAdjustDto) {
    const cId = ensureObjectId(companyId);
    let vId = (dto as any).variantId;
    if (!vId) {
       const variant = await this.variantModel.findOne({ productId: ensureObjectId(dto.productId), isDefault: true });
       if (!variant) throw new NotFoundException('Default variant not found');
       vId = variant._id;
    } else {
       vId = ensureObjectId(vId);
    }

    const stockFilter = {
      companyId: { $in: [companyId, cId] },
      variantId: vId,
      warehouseId: ensureObjectId(dto.warehouseId),
    };

    const prevStock = await this.stockModel.findOne(stockFilter);
    const previousQty = prevStock?.totalQuantity || 0;
    // Preserve existing bucket values when adjusting total
    const reserved = prevStock?.reservedQuantity || 0;
    const damaged = prevStock?.damagedQuantity || 0;
    const inTransit = prevStock?.inTransitQuantity || 0;
    const newAvailable = Math.max(0, dto.newQuantity - reserved - damaged - inTransit);

    const stock = await this.stockModel.findOneAndUpdate(
      stockFilter,
      { 
        totalQuantity: dto.newQuantity,
        availableQuantity: newAvailable, 
        $set: { companyId: cId, productId: ensureObjectId(dto.productId) },
        $setOnInsert: { reorderLevel: 10, minStockLevel: 5 }
      },
      { upsert: true, new: true }
    );

    await this.movementModel.create({
      companyId: cId,
      variantId: vId,
      productId: ensureObjectId(dto.productId),
      warehouseId: ensureObjectId(dto.warehouseId),
      bucket: 'total',
      type: dto.newQuantity >= previousQty ? 'stock_in' : 'stock_out', 
      quantity: Math.abs(dto.newQuantity - previousQty),
      previousQuantity: previousQty,
      newQuantity: dto.newQuantity,
      reference: 'ADJUSTMENT',
      referenceType: 'adjustment',
      notes: dto.reason,
      performedBy: ensureObjectId(userId),
    });

    return stock;
  }

  async stockTransfer(companyId: string, userId: string, dto: StockTransferDto) {
    const cId = ensureObjectId(companyId);
    let variantId = (dto as any).variantId;
    if (!variantId) {
       const variant = await this.variantModel.findOne({ 
         companyId: { $in: [companyId, cId] }, 
         productId: ensureObjectId(dto.productId), 
         isDefault: true 
       });
       if (!variant) throw new NotFoundException('Default variant not found');
       variantId = variant._id;
    }

    const vId = ensureObjectId(variantId);
    const pId = ensureObjectId(dto.productId);
    const fromWId = ensureObjectId(dto.fromWarehouseId);
    const toWId = ensureObjectId(dto.toWarehouseId);

    const sourceStock = await this.stockModel.findOne({ 
      companyId: { $in: [companyId, cId] }, 
      variantId: vId, 
      warehouseId: fromWId 
    });

    if (!sourceStock || sourceStock.availableQuantity < dto.quantity) {
      console.log(`[DEBUG] Transfer Fail - vId: ${vId}, fWId: ${fromWId}, Found: ${!!sourceStock}, Avail: ${sourceStock?.availableQuantity}, Req: ${dto.quantity}`);
      throw new BadRequestException(`Insufficient stock in source warehouse for variant ID ${vId}`);
    }

    sourceStock.totalQuantity -= dto.quantity;
    sourceStock.availableQuantity -= dto.quantity;
    await sourceStock.save();

    const destStock = await this.stockModel.findOneAndUpdate(
      { 
        companyId: { $in: [companyId, cId] }, 
        variantId: vId, 
        warehouseId: toWId 
      },
      { 
        $inc: { totalQuantity: dto.quantity, availableQuantity: dto.quantity },
        $set: { companyId: cId, productId: pId },
        $setOnInsert: { reorderLevel: 10, minStockLevel: 5 }
      },
      { upsert: true, new: true }
    );

    await this.movementModel.create({
      companyId: cId,
      variantId: vId,
      productId: pId,
      warehouseId: fromWId,
      bucket: 'total',
      type: 'stock_out',
      quantity: dto.quantity,
      previousQuantity: sourceStock.totalQuantity + dto.quantity,
      newQuantity: sourceStock.totalQuantity,
      reference: 'TRANSFER',
      referenceType: 'transfer',
      notes: dto.notes,
      performedBy: ensureObjectId(userId),
    });

    return { source: sourceStock, destination: destStock };
  }

  async getStockLogs(companyId: string, query: PaginationDto & { productId?: string }) {
    const { page = 1, limit = 20 } = query;
    const filter: any = { companyId: { $in: [companyId, ensureObjectId(companyId)] } };
    if (query.productId) filter.productId = ensureObjectId(query.productId);

    const [data, total] = await Promise.all([
      this.movementModel
        .find(filter)
        .populate('variantId', 'sku')
        .populate('productId', 'name')
        .populate('warehouseId', 'name')
        .populate('performedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.movementModel.countDocuments(filter),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }
}
