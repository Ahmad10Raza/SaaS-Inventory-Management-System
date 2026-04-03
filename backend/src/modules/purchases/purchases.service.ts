import { Injectable, NotFoundException, BadRequestException, Inject, Scope, ForbiddenException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Model, Connection } from 'mongoose';
import { Purchase, PurchaseDocument, PurchaseSchema } from '../../schemas/purchase.schema';
import { WarehouseStock, WarehouseStockDocument, WarehouseStockSchema } from '../../schemas/warehouse-stock.schema';
import { StockMovement, StockMovementDocument, StockMovementSchema } from '../../schemas/stock-movement.schema';
import { ProductVariant, ProductVariantDocument, ProductVariantSchema } from '../../schemas/product-variant.schema';
import { PriceHistory, PriceHistoryDocument, PriceHistorySchema } from '../../schemas/price-history.schema';
import { CreatePurchaseDto, UpdatePurchaseStatusDto, PurchasePaymentDto } from './dto/purchase.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { Vendor, VendorDocument, VendorSchema } from '../../schemas/vendor.schema';
import { ensureObjectId } from '../../common/utils/tenant.utils';

@Injectable({ scope: Scope.REQUEST })
export class PurchasesService {
  private _purchaseModel: Model<any>;
  private _stockModel: Model<any>;
  private _movementModel: Model<any>;
  private _variantModel: Model<any>;
  private _priceHistoryModel: Model<any>;
  private _vendorModel: Model<any>;

  constructor(@Inject(REQUEST) private request: any) {}

  private get purchaseModel(): Model<any> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._purchaseModel) {
      this._purchaseModel = (conn.modelNames().includes(Purchase.name) ? conn.model<any>(Purchase.name) : conn.model<any>(Purchase.name, PurchaseSchema)) as any;
    }
    return this._purchaseModel;
  }

  private get stockModel(): Model<any> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._stockModel) {
      this._stockModel = (conn.modelNames().includes(WarehouseStock.name) ? conn.model<any>(WarehouseStock.name) : conn.model<any>(WarehouseStock.name, WarehouseStockSchema)) as any;
    }
    return this._stockModel;
  }

  private get movementModel(): Model<any> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._movementModel) {
      this._movementModel = (conn.modelNames().includes(StockMovement.name) ? conn.model<any>(StockMovement.name) : conn.model<any>(StockMovement.name, StockMovementSchema)) as any;
    }
    return this._movementModel;
  }

  private get variantModel(): Model<any> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._variantModel) {
      this._variantModel = (conn.modelNames().includes(ProductVariant.name) ? conn.model<any>(ProductVariant.name) : conn.model<any>(ProductVariant.name, ProductVariantSchema)) as any;
    }
    return this._variantModel;
  }

  private get priceHistoryModel(): Model<any> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._priceHistoryModel) {
      this._priceHistoryModel = (conn.modelNames().includes(PriceHistory.name) ? conn.model<any>(PriceHistory.name) : conn.model<any>(PriceHistory.name, PriceHistorySchema)) as any;
    }
    return this._priceHistoryModel;
  }

  private get vendorModel(): Model<any> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._vendorModel) {
      this._vendorModel = (conn.modelNames().includes(Vendor.name) ? conn.model<any>(Vendor.name) : conn.model<any>(Vendor.name, VendorSchema)) as any;
    }
    return this._vendorModel;
  }

  private generatePONumber(): string {
    const prefix = 'PO';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  async create(companyId: string, userId: string, dto: CreatePurchaseDto) {
    const cId = ensureObjectId(companyId);
    
    const items = dto.items.map(item => {
      const discountAmt = item.discount || 0;
      const subtotal = item.unitPrice * item.quantity - discountAmt;
      const taxAmount = (subtotal * (item.taxPercentage || 0)) / 100;
      const totalPrice = subtotal + taxAmount;
      return { ...item, variantId: ensureObjectId(item.variantId), discount: discountAmt, taxAmount, totalPrice };
    });

    const subtotal = items.reduce((s, i) => s + (i.unitPrice * i.quantity - (i.discount || 0)), 0);
    const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
    const itemDiscounts = items.reduce((s, i) => s + (i.discount || 0), 0);
    const orderLevelDiscount = Number(dto.discount || 0);
    const transportCost = Number(dto.transportCost || 0);
    const totalAmount = subtotal + totalTax + transportCost - orderLevelDiscount;

    const po = await this.purchaseModel.create({
      companyId: cId,
      purchaseNumber: this.generatePONumber(),
      vendorId: ensureObjectId(dto.vendorId),
      warehouseId: ensureObjectId(dto.warehouseId),
      items,
      subtotal,
      discount: itemDiscounts + orderLevelDiscount,
      transportCost,
      taxAmount: totalTax,
      totalAmount,
      status: 'pending',
      paymentStatus: 'unpaid',
      paidAmount: 0,
      expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined,
      notes: dto.notes,
      createdBy: userId,
    });

    await this.vendorModel.findByIdAndUpdate(ensureObjectId(dto.vendorId), {
      $inc: {
        totalOrders: 1,
        totalAmount: totalAmount,
        outstandingAmount: totalAmount,
      },
    });

    return po;
  }

  async findAll(companyId: string, query: PaginationDto & { status?: string }) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const filter: any = { companyId: { $in: [companyId, ensureObjectId(companyId)] } };
    if (query.status) filter.status = query.status;
    if (search) {
      filter.$or = [
        { purchaseNumber: { $regex: search, $options: 'i' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.purchaseModel.find(filter)
        .populate('vendorId', 'name')
        .populate('warehouseId', 'name')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      this.purchaseModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(companyId: string, id: string) {
    const filter = { _id: ensureObjectId(id), companyId: { $in: [companyId, ensureObjectId(companyId)] } };
    const po = await this.purchaseModel.findOne(filter)
      .populate('vendorId', 'name email phone')
      .populate('warehouseId', 'name')
      .lean();
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async updateStatus(companyId: string, id: string, userId: string, dto: UpdatePurchaseStatusDto) {
    const po = await this.purchaseModel.findOne({ _id: ensureObjectId(id), companyId: { $in: [companyId, ensureObjectId(companyId)] } });
    if (!po) throw new NotFoundException('Purchase order not found');

    const previousStatus = po.status;
    const userRole = this.request.user?.role;

    if (dto.status === 'approved') {
      if (!['super_admin', 'company_owner', 'purchase_manager'].includes(userRole)) {
        throw new ForbiddenException('Only managers or admins can approve purchase orders');
      }
      if (previousStatus !== 'pending' && previousStatus !== 'draft') {
        throw new BadRequestException(`Cannot approve PO from ${previousStatus} status`);
      }
      po.approvedBy = userId as any;
    }

    if (dto.status === 'received' || dto.status === 'partially_received' || dto.status === 'fully_received') {
      if (!['super_admin', 'company_owner', 'purchase_manager', 'warehouse_manager'].includes(userRole)) {
        throw new ForbiddenException('Only managers or admins can mark orders as received');
      }
      if (!po.warehouseId) throw new BadRequestException('A warehouse must be specified to receive stock');
      
      const itemsToReceive = dto.items || (dto.status === 'fully_received' ? po.items.map((i: any) => ({
        variantId: i.variantId.toString(),
        receivedQuantity: i.quantity - i.receivedQuantity
      })) : []);

      const cId = ensureObjectId(companyId);
      for (const receiveItem of itemsToReceive) {
        const poItem = po.items.find((i: any) => i.variantId.toString() === receiveItem.variantId);
        if (!poItem) continue;

        const qtyToIn = receiveItem.receivedQuantity;
        if (qtyToIn <= 0) continue;

        const variant = await this.variantModel.findById(ensureObjectId(poItem.variantId));
        if (!variant) continue;

        const stock = await this.stockModel.findOneAndUpdate(
          { 
            companyId: { $in: [companyId, cId] }, 
            variantId: ensureObjectId(poItem.variantId), 
            warehouseId: ensureObjectId(po.warehouseId) 
          },
          { 
            $inc: { totalQuantity: qtyToIn, availableQuantity: qtyToIn },
            $set: { companyId: cId, productId: variant.productId },
            $setOnInsert: { reorderLevel: 10, minStockLevel: 5 }
          },
          { upsert: true, new: true }
        );

        await this.movementModel.create({
          companyId: ensureObjectId(companyId), 
          variantId: ensureObjectId(poItem.variantId), 
          warehouseId: ensureObjectId(po.warehouseId),
          productId: variant.productId,
          bucket: 'total', type: 'stock_in', quantity: qtyToIn,
          previousQuantity: stock.totalQuantity - qtyToIn, newQuantity: stock.totalQuantity,
          reference: po.purchaseNumber, referenceType: 'purchase',
          performedBy: ensureObjectId(userId),
        });

        if (variant.costPrice !== poItem.unitPrice) {
          await this.priceHistoryModel.create({
            companyId: ensureObjectId(companyId), 
            variantId: ensureObjectId(poItem.variantId), 
            priceType: 'cost',
            oldPrice: variant.costPrice, newPrice: poItem.unitPrice,
            currency: 'USD', 
            changedBy: ensureObjectId(userId), 
            source: 'purchase_order_received',
            reason: `Updated via PO: ${po.purchaseNumber}`
          });
          variant.costPrice = poItem.unitPrice;
          await variant.save();
        }

        poItem.receivedQuantity += qtyToIn;
      }
      
      po.receivedDate = new Date();
      const allReceived = po.items.every((i: any) => i.receivedQuantity >= i.quantity);
      po.status = allReceived ? 'fully_received' : 'partially_received';
    } else {
      po.status = dto.status as any;
    }

    if (dto.status === 'cancelled') {
        const cId = ensureObjectId(companyId);
        for (const item of po.items) {
            if (item.receivedQuantity > 0) {
                const stock = await this.stockModel.findOneAndUpdate(
                    { 
                        companyId: { $in: [companyId, cId] }, 
                        variantId: ensureObjectId(item.variantId), 
                        warehouseId: ensureObjectId(po.warehouseId) 
                    },
                    { $inc: { totalQuantity: -item.receivedQuantity, availableQuantity: -item.receivedQuantity } },
                    { new: true }
                );
                
                if (stock) {
                    await this.movementModel.create({
                        companyId: cId, 
                        variantId: ensureObjectId(item.variantId), 
                        warehouseId: ensureObjectId(po.warehouseId),
                        productId: item.productId,
                        bucket: 'total', type: 'stock_out', quantity: item.receivedQuantity,
                        previousQuantity: stock.totalQuantity + item.receivedQuantity, newQuantity: stock.totalQuantity,
                        reference: po.purchaseNumber, referenceType: 'purchase',
                        performedBy: ensureObjectId(userId), 
                        notes: 'PO Cancellation Stock Reversal'
                    });
                }
            }
        }
    }
    await po.save();
    return po;
  }

  async recordPayment(companyId: string, id: string, dto: PurchasePaymentDto) {
    const filter = { _id: ensureObjectId(id), companyId: { $in: [companyId, ensureObjectId(companyId)] } };
    const po = await this.purchaseModel.findOne(filter);
    if (!po) throw new NotFoundException('Purchase order not found');

    po.paidAmount = (po.paidAmount || 0) + dto.amount;
    if (po.paidAmount >= po.totalAmount) {
      po.paymentStatus = 'paid';
    } else {
      po.paymentStatus = 'partial';
    }
    await po.save();

    // Bug 7: Update vendor outstanding balance
    await this.vendorModel.findByIdAndUpdate(ensureObjectId(po.vendorId), {
      $inc: { outstandingAmount: -dto.amount },
    });

    return po;
  }

  async getStats(companyId: string) {
    const cId = ensureObjectId(companyId);
    const filter = { companyId: { $in: [companyId, cId] } };
    
    const [totalPOs, pending, totalSpent] = await Promise.all([
      this.purchaseModel.countDocuments(filter),
      this.purchaseModel.countDocuments({ ...filter, status: 'pending' }),
      this.purchaseModel.aggregate([
        { $match: { companyId: { $in: [companyId, cId] }, status: { $in: ['approved', 'received', 'fully_received'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);
    return {
      totalPOs,
      pending,
      totalSpent: totalSpent[0]?.total || 0,
    };
  }
}
