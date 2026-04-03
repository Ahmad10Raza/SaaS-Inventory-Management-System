import { Injectable, NotFoundException, BadRequestException, Inject, Scope, ForbiddenException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Model } from 'mongoose';
import { WarehouseTransfer, WarehouseTransferDocument, WarehouseTransferSchema } from '../../schemas/warehouse-transfer.schema';
import { WarehouseStock, WarehouseStockDocument, WarehouseStockSchema } from '../../schemas/warehouse-stock.schema';
import { StockMovement, StockMovementDocument, StockMovementSchema } from '../../schemas/stock-movement.schema';
import { ProductVariant, ProductVariantDocument, ProductVariantSchema } from '../../schemas/product-variant.schema';
import { CreateTransferDto, UpdateTransferStatusDto } from './dto/transfer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ensureObjectId } from '../../common/utils/tenant.utils';
import { Connection } from 'mongoose';

@Injectable({ scope: Scope.REQUEST })
export class TransfersService {
  private transferModel: Model<WarehouseTransferDocument>;
  private stockModel: Model<WarehouseStockDocument>;
  private movementModel: Model<StockMovementDocument>;
  private variantModel: Model<ProductVariantDocument>;

  constructor(@Inject(REQUEST) private request: any) {
    const conn = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    
    this.transferModel = conn.modelNames().includes(WarehouseTransfer.name) ? conn.model<any>(WarehouseTransfer.name) as any : conn.model<any>(WarehouseTransfer.name, WarehouseTransferSchema) as any;
    this.stockModel = conn.modelNames().includes(WarehouseStock.name) ? conn.model<any>(WarehouseStock.name) as any : conn.model<any>(WarehouseStock.name, WarehouseStockSchema) as any;
    this.movementModel = conn.modelNames().includes(StockMovement.name) ? conn.model<any>(StockMovement.name) as any : conn.model<any>(StockMovement.name, StockMovementSchema) as any;
    this.variantModel = conn.modelNames().includes(ProductVariant.name) ? conn.model<any>(ProductVariant.name) as any : conn.model<any>(ProductVariant.name, ProductVariantSchema) as any;
  }

  private generateTRNumber(): string {
    const prefix = 'TR';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  async create(companyId: string, userId: string, dto: CreateTransferDto) {
    if (dto.fromWarehouseId === dto.toWarehouseId) throw new BadRequestException('Source and destination cannot be the same');

    const cId = ensureObjectId(companyId);
    const fromWId = ensureObjectId(dto.fromWarehouseId);
    const toWId = ensureObjectId(dto.toWarehouseId);

    // Check available stock first
    for (const item of dto.items) {
      const vId = ensureObjectId(item.variantId);
      const stock = await this.stockModel.findOne({ 
        companyId: { $in: [companyId, cId] }, 
        variantId: vId, 
        warehouseId: fromWId 
      });
      if (!stock || stock.availableQuantity < item.quantity) {
        throw new BadRequestException(`Insufficient stock in source warehouse for variant ID ${item.variantId}`);
      }
    }

    return this.transferModel.create({
      companyId: cId,
      transferNumber: this.generateTRNumber(),
      fromWarehouseId: fromWId,
      toWarehouseId: toWId,
      items: dto.items.map(i => ({ ...i, variantId: ensureObjectId(i.variantId) })),
      status: 'pending',
      createdBy: ensureObjectId(userId),
      notes: dto.notes,
    });
  }

  async findAll(companyId: string, query: PaginationDto) {
    const { page = 1, limit = 20 } = query;
    const cId = ensureObjectId(companyId);
    const filter: any = { companyId: { $in: [companyId, cId] } };
    const [data, total] = await Promise.all([
      this.transferModel.find(filter)
        .populate('fromWarehouseId', 'name')
        .populate('toWarehouseId', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      this.transferModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async updateStatus(companyId: string, id: string, userId: string, dto: UpdateTransferStatusDto) {
    const cId = ensureObjectId(companyId);
    const transfer = await this.transferModel.findOne({ _id: ensureObjectId(id), companyId: { $in: [companyId, cId] } });
    if (!transfer) throw new NotFoundException('Transfer not found');

    const prevStatus = transfer.status;
    const userRole = this.request.user?.role;
    const uId = ensureObjectId(userId);

    if (dto.status === 'in_transit') {
      if (prevStatus !== 'pending' && prevStatus !== 'approved') throw new BadRequestException('Transfer must be pending or approved');
      
      const fromWId = ensureObjectId(transfer.fromWarehouseId);
      const toWId = ensureObjectId(transfer.toWarehouseId);

      // LOGIC: Deduct Total from Source, Add to In-Transit at Destination
      for (const item of transfer.items) {
        const vId = ensureObjectId(item.variantId);
        const variant = await this.variantModel.findById(vId);
        if (!variant) throw new BadRequestException(`Variant not found: ${item.variantId}`);

        // From Source
        const fromStock = await this.stockModel.findOne({ 
          companyId: { $in: [companyId, cId] }, 
          variantId: vId, 
          warehouseId: fromWId 
        });
        if (!fromStock || fromStock.totalQuantity < item.quantity) throw new BadRequestException('Inconsistent stock states at source');
        
        const prevFrom = fromStock.totalQuantity;
        fromStock.totalQuantity -= item.quantity;
        await fromStock.save();

        await this.movementModel.create({
          companyId: cId, variantId: vId, productId: variant.productId, warehouseId: fromWId,
          bucket: 'total', type: 'transfer_start', quantity: item.quantity,
          previousQuantity: prevFrom, newQuantity: fromStock.totalQuantity,
          reference: transfer.transferNumber, referenceType: 'transfer', performedBy: uId
        });

        // To Destination (Add to In-Transit)
        let toStock = await this.stockModel.findOne({ 
          companyId: { $in: [companyId, cId] }, 
          variantId: vId, 
          warehouseId: toWId 
        });
        const prevTransit = toStock?.inTransitQuantity || 0;
        
        if (toStock) {
          toStock.inTransitQuantity += item.quantity;
          await toStock.save();
        } else {
          toStock = await this.stockModel.create({
            companyId: cId, variantId: vId, productId: variant.productId, warehouseId: toWId,
            inTransitQuantity: item.quantity, totalQuantity: 0, availableQuantity: 0
          });
        }

        await this.movementModel.create({
          companyId: cId, variantId: vId, productId: variant.productId, warehouseId: toWId,
          bucket: 'in_transit', type: 'transfer_start', quantity: item.quantity,
          previousQuantity: prevTransit, newQuantity: toStock.inTransitQuantity,
          reference: transfer.transferNumber, referenceType: 'transfer', performedBy: uId
        });
      }
      transfer.shippedDate = new Date();
    }

    if (dto.status === 'received') {
      if (prevStatus !== 'in_transit') throw new BadRequestException('Transfer must be in transit before it can be received');
      
      const toWId = ensureObjectId(transfer.toWarehouseId);

      // LOGIC: Deduct In-Transit at Destination, Add to Total at Destination
      for (const item of transfer.items) {
        const vId = ensureObjectId(item.variantId);
        const variant = await this.variantModel.findById(vId);
        const toStock = await this.stockModel.findOne({ 
          companyId: { $in: [companyId, cId] }, 
          variantId: vId, 
          warehouseId: toWId 
        });
        if (!toStock || (toStock.inTransitQuantity || 0) < item.quantity) throw new BadRequestException('Inconsistent in-transit counts');
        
        const prevTransit = toStock.inTransitQuantity;
        const prevTotal = toStock.totalQuantity;

        toStock.inTransitQuantity -= item.quantity;
        toStock.totalQuantity += item.quantity;
        toStock.availableQuantity += item.quantity; // Ensure available is also updated on receive
        await toStock.save();

        await this.movementModel.create({
          companyId: cId, variantId: vId, productId: variant?.productId, warehouseId: toWId,
          bucket: 'in_transit', type: 'transfer_complete', quantity: item.quantity,
          previousQuantity: prevTransit, newQuantity: toStock.inTransitQuantity,
          reference: transfer.transferNumber, referenceType: 'transfer', performedBy: uId
        });

        await this.movementModel.create({
          companyId: cId, variantId: vId, productId: variant?.productId, warehouseId: toWId,
          bucket: 'total', type: 'transfer_complete', quantity: item.quantity,
          previousQuantity: prevTotal, newQuantity: toStock.totalQuantity,
          reference: transfer.transferNumber, referenceType: 'transfer', performedBy: uId
        });
      }
      transfer.receivedDate = new Date();
      transfer.receivedBy = uId as any;
    }

    transfer.status = dto.status;
    await transfer.save();
    return transfer;
  }
}
