import { Injectable, NotFoundException, BadRequestException, Inject, Scope, ForbiddenException } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model, Connection } from 'mongoose';
import { Sale, SaleDocument, SaleSchema } from '../../schemas/sale.schema';
import { Invoice, InvoiceDocument, InvoiceSchema } from '../../schemas/invoice.schema';
import { WarehouseStock, WarehouseStockDocument, WarehouseStockSchema } from '../../schemas/warehouse-stock.schema';
import { StockMovement, StockMovementDocument, StockMovementSchema } from '../../schemas/stock-movement.schema';
import { ProductVariant, ProductVariantDocument, ProductVariantSchema } from '../../schemas/product-variant.schema';
import { Customer, CustomerDocument, CustomerSchema } from '../../schemas/customer.schema';
import { PriceHistory, PriceHistoryDocument, PriceHistorySchema } from '../../schemas/price-history.schema';
import { CreateSaleDto, SalePaymentDto, UpdateSaleStatusDto } from './dto/sale.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ensureObjectId } from '../../common/utils/tenant.utils';

@Injectable({ scope: Scope.REQUEST })
export class SalesService {
  private _saleModel: Model<SaleDocument>;
  private _invoiceModel: Model<InvoiceDocument>;
  private _stockModel: Model<WarehouseStockDocument>;
  private _movementModel: Model<StockMovementDocument>;
  private _variantModel: Model<ProductVariantDocument>;
  private _customerModel: Model<CustomerDocument>;
  private _priceHistoryModel: Model<PriceHistoryDocument>;

  constructor(@Inject(REQUEST) private request: any) {}

  private get saleModel(): Model<SaleDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._saleModel) {
      this._saleModel = (conn.modelNames().includes(Sale.name) ? conn.model(Sale.name) : conn.model(Sale.name, SaleSchema)) as any;
    }
    return this._saleModel;
  }

  private get invoiceModel(): Model<InvoiceDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._invoiceModel) {
      this._invoiceModel = (conn.modelNames().includes(Invoice.name) ? conn.model(Invoice.name) : conn.model(Invoice.name, InvoiceSchema)) as any;
    }
    return this._invoiceModel;
  }

  private get stockModel(): Model<WarehouseStockDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._stockModel) {
      this._stockModel = (conn.modelNames().includes(WarehouseStock.name) ? conn.model(WarehouseStock.name) : conn.model(WarehouseStock.name, WarehouseStockSchema)) as any;
    }
    return this._stockModel;
  }

  private get movementModel(): Model<StockMovementDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._movementModel) {
      this._movementModel = (conn.modelNames().includes(StockMovement.name) ? conn.model(StockMovement.name) : conn.model(StockMovement.name, StockMovementSchema)) as any;
    }
    return this._movementModel;
  }

  private get variantModel(): Model<ProductVariantDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._variantModel) {
      this._variantModel = (conn.modelNames().includes(ProductVariant.name) ? conn.model(ProductVariant.name) : conn.model(ProductVariant.name, ProductVariantSchema)) as any;
    }
    return this._variantModel;
  }

  private get customerModel(): Model<CustomerDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._customerModel) {
      this._customerModel = (conn.modelNames().includes(Customer.name) ? conn.model(Customer.name) : conn.model(Customer.name, CustomerSchema)) as any;
    }
    return this._customerModel;
  }

  private get priceHistoryModel(): Model<PriceHistoryDocument> {
    const conn: Connection = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    if (!this._priceHistoryModel) {
      this._priceHistoryModel = (conn.modelNames().includes(PriceHistory.name) ? conn.model(PriceHistory.name) : conn.model(PriceHistory.name, PriceHistorySchema)) as any;
    }
    return this._priceHistoryModel;
  }

  private generateNumber(prefix: string): string {
    const ts = Date.now().toString(36).toUpperCase();
    const rand = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `${prefix}-${ts}-${rand}`;
  }

  async create(companyId: string, userId: string, dto: CreateSaleDto) {
    // Calculate item totals
    const items = dto.items.map(item => {
      const discountAmt = item.discount || 0;
      const subtotal = item.unitPrice * item.quantity - discountAmt;
      const taxAmount = (subtotal * (item.taxPercentage || 0)) / 100;
      const totalPrice = subtotal + taxAmount;
      return { ...item, discount: discountAmt, taxAmount, totalPrice };
    });

    const subtotal = items.reduce((s, i) => s + (i.unitPrice * i.quantity - (i.discount || 0)), 0);
    const totalTax = items.reduce((s, i) => s + i.taxAmount, 0);
    const totalDiscount = items.reduce((s, i) => s + (i.discount || 0), 0);
    const totalAmount = subtotal + totalTax;

    // Just check stock availability in create, don't deduct yet. Deduction happens on 'shipped' status.
    // Check Available Stock (Strict ERP check)
    if (dto.warehouseId) {
      for (const item of items) {
        const stockFilter = {
          companyId: { $in: [companyId, ensureObjectId(companyId)] },
          variantId: ensureObjectId(item.variantId),
          warehouseId: ensureObjectId(dto.warehouseId),
        };
        const stock = await this.stockModel.findOne(stockFilter);
        if (!stock || stock.availableQuantity < item.quantity) {
          throw new BadRequestException(`Insufficient available stock for ${item.productName}. Required: ${item.quantity}, Available: ${stock?.availableQuantity || 0}`);
        }
      }
    }

    const isPaidUpfront = !!dto.paymentMethod && dto.paymentMethod !== 'pending';

    const userRole = this.request.user?.role;
    const initialStatus = (userRole === 'staff' || userRole === 'read_only') ? 'draft' : 'confirmed';

    const cId = ensureObjectId(companyId);
    
    // Create sale
    const sale = await this.saleModel.create({
      companyId: cId,
      saleNumber: this.generateNumber('SL'),
      customerId: ensureObjectId(dto.customerId),
      warehouseId: ensureObjectId(dto.warehouseId),
      items: items.map(i => ({ ...i, variantId: ensureObjectId(i.variantId) })),
      subtotal,
      discount: totalDiscount,
      taxAmount: totalTax,
      totalAmount,
      status: initialStatus,
      paymentStatus: isPaidUpfront ? 'paid' : 'unpaid',
      paidAmount: isPaidUpfront ? totalAmount : 0,
      notes: dto.notes,
      createdBy: userId,
    });

    // Auto-generate invoice
    const invoiceNumber = this.generateNumber('INV');
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 30);

    const invoice = await this.invoiceModel.create({
      companyId: cId,
      invoiceNumber,
      type: 'sale',
      referenceId: sale._id as any,
      customerId: ensureObjectId(dto.customerId),
      items: items.map(i => ({
        description: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice,
        taxPercentage: i.taxPercentage || 0,
        taxAmount: i.taxAmount,
        totalPrice: i.totalPrice,
      })),
      subtotal,
      taxDetails: { cgst: 0, sgst: 0, igst: 0, totalTax },
      totalAmount,
      status: isPaidUpfront ? 'paid' : 'sent',
      dueDate,
      ...(isPaidUpfront && { paidDate: new Date() }),
    });

    // Bug 6 fix: Update customer stats
    await this.customerModel.findByIdAndUpdate(ensureObjectId(dto.customerId), {
      $inc: {
        totalPurchases: totalAmount,
        outstandingAmount: isPaidUpfront ? 0 : totalAmount,
      },
    });

    // Auto-reserve stock if confirmed immediately (Real-time update)
    if (initialStatus === 'confirmed' && dto.warehouseId) {
      for (const item of items) {
        const vId = ensureObjectId(item.variantId);
        const wId = ensureObjectId(dto.warehouseId);
        const stockFilter = {
          companyId: { $in: [companyId, ensureObjectId(companyId)] },
          variantId: vId,
          warehouseId: wId,
        };
        const stock = await this.stockModel.findOne(stockFilter);
        if (stock) {
          const variant = await this.variantModel.findById(vId);
          const prevReserved = stock.reservedQuantity || 0;
          stock.reservedQuantity = prevReserved + item.quantity;
          await stock.save();

          await this.movementModel.create({
            companyId: cId,
            variantId: vId,
            productId: variant?.productId,
            warehouseId: wId,
            bucket: 'reserved',
            type: 'reserved_lock',
            quantity: item.quantity,
            previousQuantity: prevReserved,
            newQuantity: stock.reservedQuantity,
            reference: sale.saleNumber,
            referenceType: 'sale',
            performedBy: userId,
          });
        }
      }
    }

    // Bug 15 fix: Record sales price history
    for (const item of items) {
      const vId = ensureObjectId(item.variantId);
      const variant = await this.variantModel.findById(vId);
      if (variant && variant.price !== item.unitPrice) {
        await this.priceHistoryModel.create({
          companyId: cId, variantId: vId, priceType: 'selling',
          oldPrice: variant.price, newPrice: item.unitPrice,
          currency: 'INR', changedBy: userId, source: 'sale_order',
          reason: `Selling price used in ${sale.saleNumber}`,
        });
      }
    }

    return { sale, invoice };
  }

  async findAll(companyId: string, query: PaginationDto & { status?: string }) {
    const { page = 1, limit = 20, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const filter: any = { companyId: { $in: [companyId, ensureObjectId(companyId)] } };
    if (query.status) filter.status = query.status;
    if (search) {
      filter.$or = [{ saleNumber: { $regex: search, $options: 'i' } }];
    }

    const [data, total] = await Promise.all([
      this.saleModel.find(filter)
        .populate('customerId', 'name email')
        .populate('warehouseId', 'name')
        .sort({ [sortBy]: sortOrder === 'asc' ? 1 : -1 })
        .skip((page - 1) * limit).limit(limit).lean(),
      this.saleModel.countDocuments(filter),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(companyId: string, id: string) {
    const filter = { _id: ensureObjectId(id), companyId: { $in: [companyId, ensureObjectId(companyId)] } };
    const sale = await this.saleModel.findOne(filter)
      .populate('customerId', 'name email phone gstNumber')
      .populate('warehouseId', 'name')
      .lean();
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }

  async getInvoice(companyId: string, saleId: string) {
    const filter = { referenceId: ensureObjectId(saleId), companyId: { $in: [companyId, ensureObjectId(companyId)] } };
    const invoice = await this.invoiceModel.findOne(filter)
      .populate('customerId', 'name email phone address gstNumber')
      .lean();
    if (!invoice) throw new NotFoundException('Invoice not found');
    return invoice;
  }

  async recordPayment(companyId: string, id: string, dto: SalePaymentDto) {
    const filter = { _id: ensureObjectId(id), companyId: { $in: [companyId, ensureObjectId(companyId)] } };
    const sale = await this.saleModel.findOne(filter);
    if (!sale) throw new NotFoundException('Sale not found');

    sale.paidAmount = (sale.paidAmount || 0) + dto.amount;
    sale.paymentStatus = sale.paidAmount >= sale.totalAmount ? 'paid' : 'partial';
    await sale.save();

    // Update invoice
    await this.invoiceModel.findOneAndUpdate(
      { referenceId: id, companyId },
      {
        status: sale.paymentStatus === 'paid' ? 'paid' : 'sent',
        paidDate: sale.paymentStatus === 'paid' ? new Date() : undefined,
      }
    );

    // Bug 6 fix: Reduce customer outstanding balance
    await this.customerModel.findByIdAndUpdate(ensureObjectId(sale.customerId), {
      $inc: { outstandingAmount: -dto.amount },
    });

    return sale;
  }

  async updateStatus(companyId: string, id: string, userId: string, status: string) {
    const sale = await this.saleModel.findOne({ _id: id, companyId });
    if (!sale) throw new NotFoundException('Sale not found');

    const prevStatus = sale.status;
    const userRole = this.request.user?.role;

    if (status === 'confirmed') {
      if (!['super_admin', 'company_owner', 'sales_manager'].includes(userRole)) throw new ForbiddenException('No permission');
      if (prevStatus !== 'draft') throw new BadRequestException('Invalid status transition');
    }

    if (status === 'reserved') {
      if (prevStatus !== 'confirmed' && prevStatus !== 'draft') throw new BadRequestException('Must be confirmed first');
      
      const cId = ensureObjectId(companyId);

      for (const item of sale.items) {
        const vId = ensureObjectId(item.variantId);
        const wId = ensureObjectId(sale.warehouseId);
        const stockFilter = {
          companyId: { $in: [companyId, cId] },
          variantId: vId,
          warehouseId: wId,
        };
        const stock = await this.stockModel.findOne(stockFilter);
        if (!stock || stock.availableQuantity < item.quantity) throw new BadRequestException(`No available stock to reserve item ${item.productName}`);
        
        const variant = await this.variantModel.findById(vId);
        const prevReserved = stock.reservedQuantity || 0;
        stock.reservedQuantity = prevReserved + item.quantity;
        await stock.save();

        await this.movementModel.create({
          companyId: cId, variantId: vId, productId: variant?.productId, warehouseId: wId,
          bucket: 'reserved', type: 'reserved_lock', quantity: item.quantity,
          previousQuantity: prevReserved, newQuantity: stock.reservedQuantity,
          reference: sale.saleNumber, referenceType: 'sale', performedBy: ensureObjectId(userId)
        });
      }
    }

    if (status === 'shipped') {
      if (prevStatus !== 'reserved') throw new BadRequestException('Stock must be reserved before shipping');
      
      const cId = ensureObjectId(companyId);

      // DEDUCT from BOTH Total and Reserved
      for (const item of sale.items) {
        const vId = ensureObjectId(item.variantId);
        const wId = ensureObjectId(sale.warehouseId);
        const stockFilter = {
          companyId: { $in: [companyId, cId] },
          variantId: vId,
          warehouseId: wId,
        };
        const stock = await this.stockModel.findOne(stockFilter);
        if (!stock) throw new BadRequestException('Stock record vanished');
        
        const variant = await this.variantModel.findById(vId);
        const prevTotal = stock.totalQuantity;

        stock.totalQuantity -= item.quantity;
        stock.reservedQuantity -= item.quantity;
        await stock.save();

        // Log deduction from Total
        await this.movementModel.create({
          companyId: cId, variantId: vId, productId: variant?.productId, warehouseId: wId,
          bucket: 'total', type: 'stock_out', quantity: item.quantity,
          previousQuantity: prevTotal, newQuantity: stock.totalQuantity,
          reference: sale.saleNumber, referenceType: 'sale', performedBy: ensureObjectId(userId)
        });
      }
      sale.shippedDate = new Date();
    }

    if (status === 'cancelled') {
      if (prevStatus === 'reserved') {
        const cId = ensureObjectId(companyId);
        // RELEASE reservation
        for (const item of sale.items) {
          const vId = ensureObjectId(item.variantId);
          const wId = ensureObjectId(sale.warehouseId);
          const variant = await this.variantModel.findById(vId);
          const stock = await this.stockModel.findOne({ 
            companyId: { $in: [companyId, cId] }, 
            variantId: vId, 
            warehouseId: wId 
          });
          if (stock) {
            const prevR = stock.reservedQuantity;
            stock.reservedQuantity -= item.quantity;
            await stock.save();
            
            await this.movementModel.create({
              companyId: cId, variantId: vId, productId: variant?.productId, warehouseId: wId,
              bucket: 'reserved', type: 'reserved_release', quantity: item.quantity,
              previousQuantity: prevR, newQuantity: stock.reservedQuantity,
              reference: sale.saleNumber, referenceType: 'sale', performedBy: ensureObjectId(userId), 
              notes: 'Sale Cancellation Reserve Release'
            });
          }
        }
      }
    }

    if (status === 'returned') {
      if (prevStatus !== 'delivered' && prevStatus !== 'shipped') throw new BadRequestException('Cannot return non-shipped order');
      
      const cId = ensureObjectId(companyId);
      // RESTORE Total stock
      for (const item of sale.items) {
        const vId = ensureObjectId(item.variantId);
        const wId = ensureObjectId(sale.warehouseId);
        const variant = await this.variantModel.findById(vId);
        const stock = await this.stockModel.findOne({ 
          companyId: { $in: [companyId, cId] }, 
          variantId: vId, 
          warehouseId: wId 
        });
        if (stock) {
          const prevT = stock.totalQuantity;
          stock.totalQuantity += item.quantity;
          await stock.save();
          
          await this.movementModel.create({
            companyId: cId, variantId: vId, productId: variant?.productId, warehouseId: wId,
            bucket: 'total', type: 'stock_in', quantity: item.quantity,
            previousQuantity: prevT, newQuantity: stock.totalQuantity,
            reference: sale.saleNumber, referenceType: 'return', performedBy: userId, notes: 'Sales Return'
          });
        }
      }
      // Bug 12 fix: Mark payment as refunded
      sale.paymentStatus = 'refunded';
    }

    sale.status = status;
    await sale.save();
    return sale;
  }

  async getStats(companyId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    const [totalSales, monthlySales, totalRevenue, monthlyRevenue] = await Promise.all([
      this.saleModel.countDocuments({ companyId }),
      this.saleModel.countDocuments({ companyId, createdAt: { $gte: monthStart } }),
      this.saleModel.aggregate([
        { $match: { companyId } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
      this.saleModel.aggregate([
        { $match: { companyId, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' } } },
      ]),
    ]);

    return {
      totalSales,
      monthlySales,
      totalRevenue: totalRevenue[0]?.total || 0,
      monthlyRevenue: monthlyRevenue[0]?.total || 0,
    };
  }
}
