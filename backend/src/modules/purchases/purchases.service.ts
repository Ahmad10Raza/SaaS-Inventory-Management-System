import { Injectable, NotFoundException, BadRequestException, Inject, Scope, ForbiddenException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model, Connection } from 'mongoose';
import { Purchase, PurchaseDocument, PurchaseSchema } from '../../schemas/purchase.schema';
import { Inventory, InventoryDocument, InventorySchema } from '../../schemas/inventory.schema';
import { StockLog, StockLogDocument, StockLogSchema } from '../../schemas/stock-log.schema';
import { Product, ProductDocument, ProductSchema } from '../../schemas/product.schema';
import { CreatePurchaseDto, UpdatePurchaseStatusDto, PurchasePaymentDto } from './dto/purchase.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable({ scope: Scope.REQUEST })
export class PurchasesService {
  private purchaseModel: Model<PurchaseDocument>;
  private inventoryModel: Model<InventoryDocument>;
  private stockLogModel: Model<StockLogDocument>;
  private productModel: Model<ProductDocument>;

  constructor(@Inject(REQUEST) private request: any) {
    const conn = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    
    this.purchaseModel = conn.model(Purchase.name, PurchaseSchema) as any;
    this.inventoryModel = conn.model(Inventory.name, InventorySchema) as any;
    this.stockLogModel = conn.model(StockLog.name, StockLogSchema) as any;
    this.productModel = conn.model(Product.name, ProductSchema) as any;
  }

  private generatePONumber(): string {
    const prefix = 'PO';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
  }

  async create(companyId: string, userId: string, dto: CreatePurchaseDto) {
    const items = dto.items.map(item => {
      const taxAmount = (item.unitPrice * item.quantity * (item.taxPercentage || 0)) / 100;
      const totalPrice = item.unitPrice * item.quantity + taxAmount;
      return { ...item, taxAmount, totalPrice };
    });

    const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
    const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
    const totalAmount = subtotal + totalTax;

    const userRole = this.request.user?.role;
    const initialStatus = (userRole === 'staff' || userRole === 'read_only') ? 'draft' : 'pending';

    return this.purchaseModel.create({
      companyId,
      purchaseNumber: this.generatePONumber(),
      vendorId: dto.vendorId,
      warehouseId: dto.warehouseId,
      items,
      subtotal,
      taxAmount: totalTax,
      totalAmount,
      status: initialStatus,
      paymentStatus: 'unpaid',
      paidAmount: 0,
      expectedDeliveryDate: dto.expectedDeliveryDate ? new Date(dto.expectedDeliveryDate) : undefined,
      notes: dto.notes,
      createdBy: userId,
    });
  }

  async findAll(companyId: string, query: PaginationDto & { status?: string }) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const filter: any = { companyId };
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
    const po = await this.purchaseModel.findOne({ _id: id, companyId })
      .populate('vendorId', 'name email phone')
      .populate('warehouseId', 'name')
      .lean();
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async updateStatus(companyId: string, id: string, userId: string, dto: UpdatePurchaseStatusDto) {
    const po = await this.purchaseModel.findOne({ _id: id, companyId });
    if (!po) throw new NotFoundException('Purchase order not found');

    const previousStatus = po.status;
    const userRole = this.request.user?.role;

    // Approval Workflow Logic
    if (dto.status === 'approved') {
      if (!['super_admin', 'company_owner', 'purchase_manager'].includes(userRole)) {
        throw new ForbiddenException('Only managers or admins can approve purchase orders');
      }
      if (previousStatus !== 'pending' && previousStatus !== 'draft') {
        throw new BadRequestException(`Cannot approve PO from ${previousStatus} status`);
      }
      po.approvedBy = userId as any;
    }

    if (dto.status === 'received') {
      if (!['super_admin', 'company_owner', 'purchase_manager', 'warehouse_manager'].includes(userRole)) {
        throw new ForbiddenException('Only warehouse managers or admins can mark orders as received');
      }
      if (previousStatus !== 'approved') {
        throw new BadRequestException('Purchase order must be approved before it can be marked as received');
      }
      if (!po.warehouseId) {
        throw new BadRequestException('A warehouse must be specified to receive stock');
      }
      
      // Auto stock-in when PO is received
      for (const item of po.items) {
        let inv = await this.inventoryModel.findOne({
          companyId, productId: item.productId, warehouseId: po.warehouseId,
        });
        const prevQty = inv?.quantity || 0;
        if (inv) {
          inv.quantity += item.quantity;
          await inv.save();
        } else {
          inv = await this.inventoryModel.create({
            companyId, productId: item.productId, warehouseId: po.warehouseId,
            quantity: item.quantity,
          });
        }
        // Update product total stock
        const agg = await this.inventoryModel.aggregate([
          { $match: { productId: item.productId } },
          { $group: { _id: null, total: { $sum: '$quantity' } } },
        ]);
        await this.productModel.findByIdAndUpdate(item.productId, {
          currentStock: agg[0]?.total || 0,
        });
        // Log
        await this.stockLogModel.create({
          companyId, productId: item.productId, warehouseId: po.warehouseId,
          type: 'stock_in', quantity: item.quantity,
          previousQuantity: prevQty, newQuantity: prevQty + item.quantity,
          reference: po.purchaseNumber, referenceType: 'purchase',
          performedBy: userId,
        });
      }
      po.receivedDate = new Date();
    }

    po.status = dto.status as any;
    await po.save();
    return po;
  }

  async recordPayment(companyId: string, id: string, dto: PurchasePaymentDto) {
    const po = await this.purchaseModel.findOne({ _id: id, companyId });
    if (!po) throw new NotFoundException('Purchase order not found');

    po.paidAmount = (po.paidAmount || 0) + dto.amount;
    if (po.paidAmount >= po.totalAmount) {
      po.paymentStatus = 'paid';
    } else {
      po.paymentStatus = 'partial';
    }
    await po.save();
    return po;
  }

  async getStats(companyId: string) {
    const [totalPOs, pending, totalSpent] = await Promise.all([
      this.purchaseModel.countDocuments({ companyId }),
      this.purchaseModel.countDocuments({ companyId, status: 'pending' }),
      this.purchaseModel.aggregate([
        { $match: { companyId, status: { $in: ['approved', 'received'] } } },
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
