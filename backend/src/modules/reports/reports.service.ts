import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Model } from 'mongoose';
import { Sale, SaleDocument, SaleSchema } from '../../schemas/sale.schema';
import { Purchase, PurchaseDocument, PurchaseSchema } from '../../schemas/purchase.schema';
import { WarehouseStock, WarehouseStockDocument, WarehouseStockSchema } from '../../schemas/warehouse-stock.schema';
import { StockMovement, StockMovementDocument, StockMovementSchema } from '../../schemas/stock-movement.schema';
import { ensureObjectId } from '../../common/utils/tenant.utils';

export interface ReportFilterDto {
  startDate?: string;
  endDate?: string;
}

@Injectable({ scope: Scope.REQUEST })
export class ReportsService {
  private saleModel: Model<any>;
  private purchaseModel: Model<any>;
  private stockModel: Model<any>;
  private movementModel: Model<any>;

  constructor(@Inject(REQUEST) private request: any) {
    const conn = this.request.tenantConnection as any;
    if (!conn) throw new Error('Tenant connection not found in request');
    
    this.saleModel = conn.modelNames().includes(Sale.name) ? conn.model<any>(Sale.name) as any : conn.model<any>(Sale.name, SaleSchema) as any;
    this.purchaseModel = conn.modelNames().includes(Purchase.name) ? conn.model<any>(Purchase.name) as any : conn.model<any>(Purchase.name, PurchaseSchema) as any;
    this.stockModel = conn.modelNames().includes(WarehouseStock.name) ? conn.model<any>(WarehouseStock.name) as any : conn.model<any>(WarehouseStock.name, WarehouseStockSchema) as any;
    this.movementModel = conn.modelNames().includes(StockMovement.name) ? conn.model<any>(StockMovement.name) as any : conn.model<any>(StockMovement.name, StockMovementSchema) as any;
  }

  private getDateFilter(filters: ReportFilterDto) {
    const filter: any = {};
    if (filters.startDate || filters.endDate) {
      filter.createdAt = {};
      if (filters.startDate) filter.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) {
        const eDate = new Date(filters.endDate);
        eDate.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = eDate;
      }
    }
    return filter;
  }

  async getSalesReport(companyId: string, filters: ReportFilterDto) {
    const rawSales = await this.saleModel
      .find({ 
        companyId: { $in: [companyId, ensureObjectId(companyId)] }, 
        ...this.getDateFilter(filters) 
      })
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
      .find({ 
        companyId: { $in: [companyId, ensureObjectId(companyId)] }, 
        ...this.getDateFilter(filters) 
      })
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
    const rawInventory = await this.stockModel
      .find({ companyId: { $in: [companyId, ensureObjectId(companyId)] } })
      .populate('productId', 'name')
      .populate('variantId', 'sku price costPrice')
      .populate('warehouseId', 'name')
      .lean();

    return rawInventory.map((inv: any) => {
      const product = inv.productId || {};
      const variant = inv.variantId || {};
      const qty = inv.totalQuantity || 0;
      const cost = variant.costPrice || 0;
      const status = qty === 0 ? 'Out of Stock' : qty <= (inv.reorderLevel || 10) ? 'Low Stock' : 'In Stock';
      
      return {
        'SKU': variant.sku || 'N/A',
        'Product Name': product.name || 'Unknown',
        'Variant SKU': variant.sku || 'N/A',
        'Warehouse': inv.warehouseId?.name || 'N/A',
        'Total Quantity': qty,
        'Available Quantity': inv.availableQuantity || 0,
        'Reserved Quantity': inv.reservedQuantity || 0,
        'Damaged Quantity': inv.damagedQuantity || 0,
        'In Transit': inv.inTransitQuantity || 0,
        'Unit Cost': cost,
        'Selling Price': variant.price || 0,
        'Total Valuation': qty * cost,
        'Stock Status': status,
        'Reorder Level': inv.reorderLevel || 0,
        'Min Stock Level': inv.minStockLevel || 0,
      };
    });
  }

  async getStockLogsReport(companyId: string, filters: ReportFilterDto) {
    const logs = await this.movementModel
      .find({ 
        companyId: { $in: [companyId, ensureObjectId(companyId)] }, 
        ...this.getDateFilter(filters) 
      })
      .populate('productId', 'name sku')
      .populate('variantId', 'sku')
      .populate('warehouseId', 'name')
      .populate('performedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .lean();

    return logs.map((log: any) => ({
      'Date': new Date(log.createdAt).toLocaleString(),
      'Product SKU': log.productId?.sku || 'N/A',
      'Variant SKU': log.variantId?.sku || 'N/A',
      'Warehouse': log.warehouseId?.name || 'N/A',
      'Action Type': log.type?.replace('_', ' ')?.toUpperCase() || 'N/A',
      'Quantity': log.quantity,
      'Previous Qty': log.previousQuantity,
      'New Qty': log.newQuantity,
      'Reference Type': log.referenceType || 'N/A',
      'Reference': log.reference || 'N/A',
      'Performed By': log.performedBy ? `${log.performedBy.firstName} ${log.performedBy.lastName}` : 'System',
    }));
  }

  async getProfitabilityReport(companyId: string, filters: ReportFilterDto) {
    const rawSales = await this.saleModel
      .find({ 
        companyId: { $in: [companyId, ensureObjectId(companyId)] }, 
        ...this.getDateFilter(filters), 
        status: { $in: ['shipped', 'delivered'] } 
      })
      .populate('items.variantId')
      .lean();

    const reportData: any[] = [];
    rawSales.forEach((sale: any) => {
      sale.items.forEach((item: any) => {
        const costPrice = item.variantId?.costPrice || 0;
        const revenue = item.totalPrice || 0;
        const totalCost = item.quantity * costPrice;
        const profit = revenue - totalCost;
        const margin = revenue > 0 ? (profit / revenue) * 100 : 0;

        reportData.push({
          'Date': new Date(sale.createdAt).toLocaleDateString(),
          'Order #': sale.saleNumber,
          'Product SKU': item.sku,
          'Quantity': item.quantity,
          'Unit Cost': costPrice,
          'Selling Price': item.price,
          'Total Revenue': revenue,
          'Total Cost (COGS)': totalCost,
          'Gross Profit': profit,
          'Margin %': `${margin.toFixed(2)}%`,
        });
      });
    });

    return reportData;
  }
}
