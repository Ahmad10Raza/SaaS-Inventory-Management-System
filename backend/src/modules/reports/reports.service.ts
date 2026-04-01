import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model, Connection } from 'mongoose';
import { Sale, SaleDocument, SaleSchema } from '../../schemas/sale.schema';
import { Purchase, PurchaseDocument, PurchaseSchema } from '../../schemas/purchase.schema';
import { Inventory, InventoryDocument, InventorySchema } from '../../schemas/inventory.schema';
import { StockLog, StockLogDocument, StockLogSchema } from '../../schemas/stock-log.schema';

export interface ReportFilterDto {
  startDate?: string;
  endDate?: string;
}

@Injectable({ scope: Scope.REQUEST })
export class ReportsService {
  private saleModel: Model<SaleDocument>;
  private purchaseModel: Model<PurchaseDocument>;
  private inventoryModel: Model<InventoryDocument>;
  private stockLogModel: Model<StockLogDocument>;

  constructor(@Inject(REQUEST) private request: any) {
    const conn = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    
    this.saleModel = conn.modelNames().includes(Sale.name) ? conn.model<any>(Sale.name) as any : conn.model<any>(Sale.name, SaleSchema) as any;
    this.purchaseModel = conn.modelNames().includes(Purchase.name) ? conn.model<any>(Purchase.name) as any : conn.model<any>(Purchase.name, PurchaseSchema) as any;
    this.inventoryModel = conn.modelNames().includes(Inventory.name) ? conn.model<any>(Inventory.name) as any : conn.model<any>(Inventory.name, InventorySchema) as any;
    this.stockLogModel = conn.modelNames().includes(StockLog.name) ? conn.model<any>(StockLog.name) as any : conn.model<any>(StockLog.name, StockLogSchema) as any;
  }

  private getDateFilter(filters: ReportFilterDto) {
    const filter: any = {};
    if (filters.startDate || filters.endDate) {
      filter.createdAt = {};
      if (filters.startDate) filter.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) filter.createdAt.$lte = new Date(filters.endDate);
    }
    return filter;
  }

  async getSalesReport(companyId: string, filters: ReportFilterDto) {
    const rawSales = await this.saleModel
      .find({ companyId, ...this.getDateFilter(filters) })
      .populate('customerId', 'name email phone')
      .populate('warehouseId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return rawSales.map((sale: any) => ({
      'Sale Number': sale.saleNumber,
      'Date': new Date(sale.createdAt).toLocaleDateString(),
      'Customer Name': sale.customerId?.name || 'N/A',
      'Customer Email': sale.customerId?.email || 'N/A',
      'Warehouse': sale.warehouseId?.name || 'N/A',
      'Total Items': sale.items?.length || 0,
      'Subtotal': sale.subtotal,
      'Discount': sale.discount,
      'Tax Amount': sale.taxAmount,
      'Total Amount': sale.totalAmount,
      'Status': sale.status,
      'Payment Status': sale.paymentStatus,
      'Paid Amount': sale.paidAmount,
      'Pending Amount': sale.totalAmount - (sale.paidAmount || 0),
    }));
  }

  async getPurchasesReport(companyId: string, filters: ReportFilterDto) {
    const rawPurchases = await this.purchaseModel
      .find({ companyId, ...this.getDateFilter(filters) })
      .populate('vendorId', 'name email phone')
      .populate('warehouseId', 'name')
      .sort({ createdAt: -1 })
      .lean();

    return rawPurchases.map((po: any) => ({
      'PO Number': po.purchaseNumber,
      'Date': new Date(po.createdAt).toLocaleDateString(),
      'Vendor Name': po.vendorId?.name || 'N/A',
      'Vendor Email': po.vendorId?.email || 'N/A',
      'Warehouse': po.warehouseId?.name || 'N/A',
      'Total Items': po.items?.length || 0,
      'Subtotal': po.subtotal,
      'Tax Amount': po.taxAmount,
      'Total Amount': po.totalAmount,
      'Status': po.status,
      'Payment Status': po.paymentStatus,
      'Paid Amount': po.paidAmount,
      'Expected Delivery': po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'N/A',
    }));
  }

  async getInventoryReport(companyId: string) {
    const rawInventory = await this.inventoryModel
      .find({ companyId })
      .populate('productId', 'name sku price costPrice minStockLevel reorderThreshold')
      .populate('warehouseId', 'name')
      .lean();

    return rawInventory.map((inv: any) => {
      const product = inv.productId || {};
      const qty = inv.quantity || 0;
      const cost = product.costPrice || 0;
      const status = qty === 0 ? 'Out of Stock' : qty <= (product.minStockLevel || 0) ? 'Low Stock' : 'In Stock';
      
      return {
        'SKU': product.sku || 'N/A',
        'Product Name': product.name || 'Unknown',
        'Warehouse': inv.warehouseId?.name || 'N/A',
        'Quantity': qty,
        'Unit Cost': cost,
        'Total Valuation': qty * cost,
        'Stock Status': status,
        'Min Stock Level': product.minStockLevel || 0,
      };
    });
  }

  async getStockLogsReport(companyId: string, filters: ReportFilterDto) {
    const logs = await this.stockLogModel
      .find({ companyId, ...this.getDateFilter(filters) })
      .populate('productId', 'name sku')
      .populate('warehouseId', 'name')
      .populate('performedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    return logs.map((log: any) => ({
      'Date': new Date(log.createdAt).toLocaleString(),
      'Product SKU': log.productId?.sku || 'N/A',
      'Product Name': log.productId?.name || 'N/A',
      'Warehouse': log.warehouseId?.name || 'N/A',
      'Action Type': log.type.replace('_', ' ').toUpperCase(),
      'Quantity Changed': log.quantity,
      'Previous Qty': log.previousQuantity,
      'New Qty': log.newQuantity,
      'Reference Type': log.referenceType || 'N/A',
      'Reference': log.reference || 'N/A',
      'Performed By': log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'System',
    }));
  }
}
