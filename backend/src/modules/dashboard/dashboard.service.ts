import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Request } from 'express';
import { Model, Connection } from 'mongoose';
import { Product, ProductDocument, ProductSchema } from '../../schemas/product.schema';
import { Customer, CustomerDocument, CustomerSchema } from '../../schemas/customer.schema';
import { Vendor, VendorDocument, VendorSchema } from '../../schemas/vendor.schema';
import { Sale, SaleDocument, SaleSchema } from '../../schemas/sale.schema';
import { Purchase, PurchaseDocument, PurchaseSchema } from '../../schemas/purchase.schema';
import { StockLog, StockLogDocument, StockLogSchema } from '../../schemas/stock-log.schema';

@Injectable({ scope: Scope.REQUEST })
export class DashboardService {
  private productModel: Model<ProductDocument>;
  private customerModel: Model<CustomerDocument>;
  private vendorModel: Model<VendorDocument>;
  private saleModel: Model<SaleDocument>;
  private purchaseModel: Model<PurchaseDocument>;
  private stockLogModel: Model<StockLogDocument>;

  constructor(@Inject(REQUEST) private request: any) {
    const conn = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found in request');
    
    this.productModel = conn.modelNames().includes(Product.name) ? conn.model<any>(Product.name) as any : conn.model<any>(Product.name, ProductSchema) as any;
    this.customerModel = conn.modelNames().includes(Customer.name) ? conn.model<any>(Customer.name) as any : conn.model<any>(Customer.name, CustomerSchema) as any;
    this.vendorModel = conn.modelNames().includes(Vendor.name) ? conn.model<any>(Vendor.name) as any : conn.model<any>(Vendor.name, VendorSchema) as any;
    this.saleModel = conn.modelNames().includes(Sale.name) ? conn.model<any>(Sale.name) as any : conn.model<any>(Sale.name, SaleSchema) as any;
    this.purchaseModel = conn.modelNames().includes(Purchase.name) ? conn.model<any>(Purchase.name) as any : conn.model<any>(Purchase.name, PurchaseSchema) as any;
    this.stockLogModel = conn.modelNames().includes(StockLog.name) ? conn.model<any>(StockLog.name) as any : conn.model<any>(StockLog.name, StockLogSchema) as any;
  }

  async getOverview(companyId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const [
      totalProducts,
      activeProducts,
      lowStockProducts,
      totalCustomers,
      totalVendors,
      monthlySalesAgg,
      lastMonthSalesAgg,
      monthlyPurchasesAgg,
      pendingPurchases,
      unpaidSales,
    ] = await Promise.all([
      this.productModel.countDocuments({ companyId }),
      this.productModel.countDocuments({ companyId, isActive: true }),
      this.productModel.countDocuments({
        companyId, isActive: true,
        $expr: { $lte: ['$currentStock', '$minStockLevel'] },
      }),
      this.customerModel.countDocuments({ companyId, isActive: true }),
      this.vendorModel.countDocuments({ companyId, isActive: true }),
      this.saleModel.aggregate([
        { $match: { companyId, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      this.saleModel.aggregate([
        { $match: { companyId, createdAt: { $gte: lastMonthStart, $lt: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      this.purchaseModel.aggregate([
        { $match: { companyId, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      this.purchaseModel.countDocuments({ companyId, status: 'pending' }),
      this.saleModel.aggregate([
        { $match: { companyId, paymentStatus: { $in: ['unpaid', 'partial'] } } },
        { $group: { _id: null, total: { $sum: { $subtract: ['$totalAmount', '$paidAmount'] } } } },
      ]),
    ]);

    const monthlySales = monthlySalesAgg[0]?.total || 0;
    const lastMonthSales = lastMonthSalesAgg[0]?.total || 0;
    const salesChange = lastMonthSales > 0 ? Math.round(((monthlySales - lastMonthSales) / lastMonthSales) * 100) : 0;

    return {
      totalProducts: activeProducts,
      monthlySales,
      monthlySalesCount: monthlySalesAgg[0]?.count || 0,
      salesChange,
      totalCustomers,
      lowStockProducts,
      totalVendors,
      pendingPayments: unpaidSales[0]?.total || 0,
      monthlyPurchases: monthlyPurchasesAgg[0]?.total || 0,
      pendingPurchases,
    };
  }

  async getSalesChart(companyId: string) {
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [salesByMonth, purchasesByMonth] = await Promise.all([
      this.saleModel.aggregate([
        { $match: { companyId, createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            total: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
      this.purchaseModel.aggregate([
        { $match: { companyId, createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            total: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

    // Generate all months
    const months: string[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    return months.map(month => {
      const salesEntry = salesByMonth.find((s: any) => s._id === month);
      const purchaseEntry = purchasesByMonth.find((p: any) => p._id === month);
      const monthIdx = parseInt(month.split('-')[1]) - 1;
      return {
        month: monthNames[monthIdx],
        sales: salesEntry?.total || 0,
        purchases: purchaseEntry?.total || 0,
      };
    });
  }

  async getTopProducts(companyId: string) {
    return this.saleModel.aggregate([
      { $match: { companyId } },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.productName',
          totalQuantity: { $sum: '$items.quantity' },
          totalRevenue: { $sum: '$items.totalPrice' },
        },
      },
      { $sort: { totalQuantity: -1 } },
      { $limit: 5 },
      { $project: { name: '$_id', quantity: '$totalQuantity', revenue: '$totalRevenue' } },
    ]);
  }

  async getRecentActivity(companyId: string) {
    const [recentSales, recentPurchases, recentStockLogs] = await Promise.all([
      this.saleModel.find({ companyId }).sort({ createdAt: -1 }).limit(5)
        .populate('customerId', 'name').lean(),
      this.purchaseModel.find({ companyId }).sort({ createdAt: -1 }).limit(5)
        .populate('vendorId', 'name').lean(),
      this.stockLogModel.find({ companyId }).sort({ createdAt: -1 }).limit(5)
        .populate('productId', 'name').lean(),
    ]);

    const activities = [
      ...recentSales.map((s: any) => ({
        type: 'sale', action: `Sale ${s.saleNumber}`,
        detail: `₹${s.totalAmount?.toLocaleString()} to ${s.customerId?.name || 'N/A'}`,
        time: s.createdAt,
      })),
      ...recentPurchases.map((p: any) => ({
        type: 'purchase', action: `PO ${p.purchaseOrderNumber}`,
        detail: `₹${p.totalAmount?.toLocaleString()} from ${p.vendorId?.name || 'N/A'}`,
        time: p.createdAt,
      })),
      ...recentStockLogs.map((l: any) => ({
        type: l.type, action: `Stock ${l.type?.replace('_', ' ')}`,
        detail: `${l.quantity} units of ${l.productId?.name || 'N/A'}`,
        time: l.createdAt,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

    return activities;
  }

  async getStockDistribution(companyId: string) {
    const products = await this.productModel.find({ companyId, isActive: true }).lean();
    let inStock = 0, lowStock = 0, outOfStock = 0, overstocked = 0;

    for (const p of products) {
      const stock = (p as any).currentStock || 0;
      const min = (p as any).minStockLevel || 10;
      const reorder = (p as any).reorderThreshold || min * 3;

      if (stock === 0) outOfStock++;
      else if (stock <= min) lowStock++;
      else if (stock > reorder) overstocked++;
      else inStock++;
    }

    const total = products.length || 1;
    return [
      { name: 'In Stock', value: Math.round((inStock / total) * 100), color: '#22c55e' },
      { name: 'Low Stock', value: Math.round((lowStock / total) * 100), color: '#f59e0b' },
      { name: 'Out of Stock', value: Math.round((outOfStock / total) * 100), color: '#ef4444' },
      { name: 'Overstocked', value: Math.round((overstocked / total) * 100), color: '#6366f1' },
    ];
  }
}
