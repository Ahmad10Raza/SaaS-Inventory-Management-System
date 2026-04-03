import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Model } from 'mongoose';
import { Product, ProductDocument, ProductSchema } from '../../schemas/product.schema';
import { Customer, CustomerDocument, CustomerSchema } from '../../schemas/customer.schema';
import { Vendor, VendorDocument, VendorSchema } from '../../schemas/vendor.schema';
import { Sale, SaleDocument, SaleSchema } from '../../schemas/sale.schema';
import { Purchase, PurchaseDocument, PurchaseSchema } from '../../schemas/purchase.schema';
import { WarehouseStock, WarehouseStockDocument, WarehouseStockSchema } from '../../schemas/warehouse-stock.schema';
import { StockMovement, StockMovementDocument, StockMovementSchema } from '../../schemas/stock-movement.schema';
import { ProductVariant, ProductVariantSchema } from '../../schemas/product-variant.schema';
import { Category, CategorySchema } from '../../schemas/category.schema';
import { ensureObjectId } from '../../common/utils/tenant.utils';

@Injectable({ scope: Scope.REQUEST })
export class DashboardService {
  private productModel: Model<ProductDocument>;
  private customerModel: Model<CustomerDocument>;
  private vendorModel: Model<VendorDocument>;
  private saleModel: Model<SaleDocument>;
  private purchaseModel: Model<PurchaseDocument>;
  private stockModel: Model<WarehouseStockDocument>;
  private movementModel: Model<StockMovementDocument>;
  private variantModel: Model<any>;
  private categoryModel: Model<any>;

  constructor(@Inject(REQUEST) private request: any) {
    const conn = this.request.tenantConnection as any;
    if (!conn) throw new Error('Tenant connection not found in request');
    
    this.productModel = conn.modelNames().includes(Product.name) ? conn.model<any>(Product.name) as any : conn.model<any>(Product.name, ProductSchema) as any;
    this.customerModel = conn.modelNames().includes(Customer.name) ? conn.model<any>(Customer.name) as any : conn.model<any>(Customer.name, CustomerSchema) as any;
    this.vendorModel = conn.modelNames().includes(Vendor.name) ? conn.model<any>(Vendor.name) as any : conn.model<any>(Vendor.name, VendorSchema) as any;
    this.saleModel = conn.modelNames().includes(Sale.name) ? conn.model<any>(Sale.name) as any : conn.model<any>(Sale.name, SaleSchema) as any;
    this.purchaseModel = conn.modelNames().includes(Purchase.name) ? conn.model<any>(Purchase.name) as any : conn.model<any>(Purchase.name, PurchaseSchema) as any;
    this.stockModel = conn.modelNames().includes(WarehouseStock.name) ? conn.model<any>(WarehouseStock.name) as any : conn.model<any>(WarehouseStock.name, WarehouseStockSchema) as any;
    this.movementModel = conn.modelNames().includes(StockMovement.name) ? conn.model<any>(StockMovement.name) as any : conn.model<any>(StockMovement.name, StockMovementSchema) as any;
    this.variantModel = conn.modelNames().includes(ProductVariant.name) ? conn.model<any>(ProductVariant.name) as any : conn.model<any>(ProductVariant.name, ProductVariantSchema) as any;
    this.categoryModel = conn.modelNames().includes(Category.name) ? conn.model<any>(Category.name) as any : conn.model<any>(Category.name, CategorySchema) as any;
  }

  async getOverview(companyId: string) {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const cId = ensureObjectId(companyId);
    const filter = { companyId: { $in: [companyId, cId] } };

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
      this.productModel.countDocuments(filter),
      this.productModel.countDocuments({ ...filter, isActive: true }),
      this.stockModel.countDocuments({
        ...filter,
        $expr: { $lte: ['$totalQuantity', '$reorderLevel'] },
      }),
      this.customerModel.countDocuments({ ...filter, isActive: true }),
      this.vendorModel.countDocuments({ ...filter, isActive: true }),
      this.saleModel.aggregate([
        { $match: { ...filter, createdAt: { $gte: monthStart }, status: { $nin: ['cancelled', 'returned'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      this.saleModel.aggregate([
        { $match: { ...filter, createdAt: { $gte: lastMonthStart, $lt: monthStart }, status: { $nin: ['cancelled', 'returned'] } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      this.purchaseModel.aggregate([
        { $match: { ...filter, createdAt: { $gte: monthStart } } },
        { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      ]),
      this.purchaseModel.countDocuments({ ...filter, status: 'pending' }),
      this.saleModel.aggregate([
        { $match: { ...filter, paymentStatus: { $in: ['unpaid', 'partial'] } } },
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
    const cId = ensureObjectId(companyId);
    const filter = { companyId: { $in: [companyId, cId] } };

    const [salesByMonth, purchasesByMonth] = await Promise.all([
      this.saleModel.aggregate([
        { $match: { ...filter, createdAt: { $gte: sixMonthsAgo } } },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'product_variants',
            localField: 'items.variantId',
            foreignField: '_id',
            as: 'variant'
          }
        },
        { $unwind: { path: '$variant', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            total: { $sum: { $ifNull: ['$items.totalPrice', 0] } },
            cost: { $sum: { $multiply: [{ $ifNull: ['$items.quantity', 0] }, { $ifNull: ['$variant.costPrice', '$variant.price', 0] }] } }
          },
        },
        { $sort: { _id: 1 } },
      ]),
      this.purchaseModel.aggregate([
        { $match: { ...filter, createdAt: { $gte: sixMonthsAgo } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
            total: { $sum: '$totalAmount' },
          },
        },
        { $sort: { _id: 1 } },
      ]),
    ]);

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
      
      const revenue = salesEntry?.total || 0;
      const cost = salesEntry?.cost || 0;
      
      return {
        month: monthNames[monthIdx],
        sales: revenue,
        profit: Math.max(0, revenue - cost),
        purchases: purchaseEntry?.total || 0,
      };
    });
  }

  async getTopProducts(companyId: string) {
    const cId = ensureObjectId(companyId);
    const filter = { companyId: { $in: [companyId, cId] } };
    return this.saleModel.aggregate([
      { $match: filter },
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
    const cId = ensureObjectId(companyId);
    const filter = { companyId: { $in: [companyId, cId] } };
    const [recentSales, recentPurchases, recentStockLogs] = await Promise.all([
      this.saleModel.find(filter).sort({ createdAt: -1 }).limit(5)
        .populate('customerId', 'name').lean(),
      this.purchaseModel.find(filter).sort({ createdAt: -1 }).limit(5)
        .populate('vendorId', 'name').lean(),
      this.movementModel.find(filter).sort({ createdAt: -1 }).limit(5)
        .populate({ path: 'variantId', select: 'sku' }).lean(),
    ]);

    const activities = [
      ...recentSales.map((s: any) => ({
        type: 'sale', action: `Sale ${s.saleNumber}`,
        detail: `₹${s.totalAmount?.toLocaleString()} to ${s.customerId?.name || 'N/A'}`,
        time: s.createdAt,
      })),
      ...recentPurchases.map((p: any) => ({
        type: 'purchase', action: `PO ${p.purchaseNumber}`,
        detail: `₹${p.totalAmount?.toLocaleString()} from ${p.vendorId?.name || 'N/A'}`,
        time: p.createdAt,
      })),
      ...recentStockLogs.map((l: any) => ({
        type: l.type, action: `Stock ${l.type?.replace('_', ' ')}`,
        detail: `${l.quantity} units of SKU: ${l.variantId?.sku || 'N/A'}`,
        time: l.createdAt,
      })),
    ].sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 10);

    return activities;
  }

  async getStockDistribution(companyId: string) {
    const cId = ensureObjectId(companyId);
    const filter = { companyId: { $in: [companyId, cId] } };
    const stocks = await this.stockModel.find(filter).lean();
    let inStock = 0, lowStock = 0, outOfStock = 0, overstocked = 0;

    for (const s of stocks) {
      if (s.totalQuantity === 0) outOfStock++;
      else if (s.totalQuantity <= s.reorderLevel) lowStock++;
      else if (s.totalQuantity > (s.reorderLevel * 3)) overstocked++;
      else inStock++;
    }

    const total = stocks.length || 1;
    return [
      { name: 'In Stock', value: Math.round((inStock / total) * 100), color: '#22c55e' },
      { name: 'Low Stock', value: Math.round((lowStock / total) * 100), color: '#f59e0b' },
      { name: 'Out of Stock', value: Math.round((outOfStock / total) * 100), color: '#ef4444' },
      { name: 'Overstocked', value: Math.round((overstocked / total) * 100), color: '#6366f1' },
    ];
  }

  async getBusinessMetrics(companyId: string) {
    const cId = ensureObjectId(companyId);
    const filter = { companyId: { $in: [companyId, cId] } };

    const [categorySales, topCustomers] = await Promise.all([
      // Sales by Category
      this.saleModel.aggregate([
        { $match: filter },
        { $unwind: '$items' },
        {
          $lookup: {
            from: 'product_variants',
            localField: 'items.variantId',
            foreignField: '_id',
            as: 'variant'
          }
        },
        { $unwind: '$variant' },
        {
          $lookup: {
            from: 'products',
            localField: 'variant.productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        { $unwind: '$product' },
        {
          $lookup: {
            from: 'categories',
            localField: 'product.categoryId',
            foreignField: '_id',
            as: 'category'
          }
        },
        { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: '$category.name',
            value: { $sum: '$items.totalPrice' }
          }
        },
        { $project: { name: { $ifNull: ['$_id', 'Uncategorized'] }, value: 1 } },
        { $sort: { value: -1 } }
      ]),
      // Top Customers by Revenue
      this.saleModel.aggregate([
        { $match: filter },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        { $unwind: '$customer' },
        {
          $group: {
            _id: '$customer.name',
            revenue: { $sum: '$totalAmount' },
            orders: { $sum: 1 }
          }
        },
        { $sort: { revenue: -1 } },
        { $limit: 5 }
      ])
    ]);

    return { categorySales, topCustomers };
  }
}
