import { Injectable, Inject, Scope } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { Model, Types } from 'mongoose';
import { WarehouseStock, WarehouseStockDocument, WarehouseStockSchema } from '../../schemas/warehouse-stock.schema';
import { ProductVariant, ProductVariantDocument, ProductVariantSchema } from '../../schemas/product-variant.schema';
import { Purchase, PurchaseDocument, PurchaseSchema } from '../../schemas/purchase.schema';
import { Sale, SaleDocument, SaleSchema } from '../../schemas/sale.schema';
import { StockMovement, StockMovementDocument, StockMovementSchema } from '../../schemas/stock-movement.schema';

@Injectable({ scope: Scope.REQUEST })
export class ValidationService {
  private stockModel: Model<WarehouseStockDocument>;
  private variantModel: Model<ProductVariantDocument>;
  private purchaseModel: Model<PurchaseDocument>;
  private saleModel: Model<SaleDocument>;
  private movementModel: Model<StockMovementDocument>;

  constructor(@Inject(REQUEST) private request: any) {
    const conn = this.request.tenantConnection;
    if (!conn) throw new Error('Tenant connection not found');
    
    this.stockModel = conn.modelNames().includes(WarehouseStock.name) ? conn.model<WarehouseStockDocument>(WarehouseStock.name) : conn.model<WarehouseStockDocument>(WarehouseStock.name, WarehouseStockSchema);
    this.variantModel = conn.modelNames().includes(ProductVariant.name) ? conn.model<ProductVariantDocument>(ProductVariant.name) : conn.model<ProductVariantDocument>(ProductVariant.name, ProductVariantSchema);
    this.purchaseModel = conn.modelNames().includes(Purchase.name) ? conn.model<PurchaseDocument>(Purchase.name) : conn.model<PurchaseDocument>(Purchase.name, PurchaseSchema);
    this.saleModel = conn.modelNames().includes(Sale.name) ? conn.model<SaleDocument>(Sale.name) : conn.model<SaleDocument>(Sale.name, SaleSchema);
    this.movementModel = conn.modelNames().includes(StockMovement.name) ? conn.model<StockMovementDocument>(StockMovement.name) : conn.model<StockMovementDocument>(StockMovement.name, StockMovementSchema);
  }

  async validateTenantWorkflow(companyId: string) {
    const results = {
      errors: [] as any[],
      warnings: [] as any[],
      stats: { totalVariants: 0, healthyStocks: 0, brokenStocks: 0 },
    };

    const companyObjectId = new Types.ObjectId(companyId);

    // 1. Negative Stock Check
    const negativeStocks = await this.stockModel.find({ companyId, totalQuantity: { $lt: 0 } });
    if (negativeStocks.length > 0) {
      results.errors.push({ type: 'NEGATIVE_STOCK', message: `Found ${negativeStocks.length} records with negative total quantity.` });
    }

    // 2. Bucket Mismatch Check: available = total - reserved - damaged - intransit
    const stocks = await this.stockModel.find({ companyId });
    for (const s of stocks) {
      const calculatedAvailable = s.totalQuantity - (s.reservedQuantity || 0) - (s.damagedQuantity || 0) - (s.inTransitQuantity || 0);
      if (Math.abs(s.availableQuantity - calculatedAvailable) > 0.001) {
        results.errors.push({ 
          type: 'BUCKET_MISMATCH', 
          message: `Stock mismatch for Variant ${s.variantId} in Warehouse ${s.warehouseId}: Recorded Available: ${s.availableQuantity}, Calculated: ${calculatedAvailable}` 
        });
      }
    }

    // 3. Duplicate SKU Check
    const duplicateSkus = await this.variantModel.aggregate([
      { $match: { companyId: companyObjectId } },
      { $group: { _id: '$sku', count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);
    if (duplicateSkus.length > 0) {
      results.errors.push({ type: 'DUPLICATE_SKU', message: `Found duplicate SKUs: ${duplicateSkus.map(v => v._id).join(', ')}` });
    }

    // 4. Orphaned Purchases (Status received but no stock movement logs)
    const receivedPOs = await this.purchaseModel.find({ companyId, status: { $in: ['received', 'fully_received'] } });
    for (const po of receivedPOs) {
      const movements = await this.movementModel.countDocuments({ reference: po.purchaseNumber, referenceType: 'purchase' });
      if (movements === 0) {
        results.warnings.push({ type: 'ORPHAN_PO', message: `PO ${po.purchaseNumber} marked as received but has no stock movement logs.` });
      }
    }

    // 5. Reservation Orphan Check (Reserved stock without processing sale)
    const reservedSum = await this.stockModel.aggregate([
      { $match: { companyId: companyObjectId, reservedQuantity: { $gt: 0 } } },
      { $group: { _id: null, total: { $sum: '$reservedQuantity' } } }
    ]);
    
    const activeReservedSales = await this.saleModel.aggregate([
      { $match: { companyId: companyObjectId, status: 'reserved' } },
      { $unwind: '$items' },
      { $group: { _id: null, total: { $sum: '$items.quantity' } } }
    ]);

    const stockReserved = reservedSum[0]?.total || 0;
    const saleReserved = activeReservedSales[0]?.total || 0;
    if (stockReserved !== saleReserved) {
      results.warnings.push({ 
        type: 'RESERVATION_CONFLICT', 
        message: `Reservation mismatch: Stock reserved (${stockReserved}) does not match active Reserved Sales (${saleReserved}).` 
      });
    }

    return results;
  }
}
