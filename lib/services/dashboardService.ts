import connectDB from '../mongodb';
import Product from '../models/Product';
import Requisition from '../models/Requisition';
import Transfer from '../models/Transfer';
import StockMovement from '../models/StockMovement';
import StockLevel from '../models/StockLevel';
import mongoose from 'mongoose';

export async function getDashboardData(warehouseId?: string) {
  await connectDB();

  // Total SKUs
  const totalSKUs = await Product.countDocuments({ isActive: true });

  // Low stock items
  const products = await Product.find({ isActive: true });
  let lowStockCount = 0;
  for (const product of products) {
    let totalQuantity = 0;
    if (warehouseId) {
      const stockLevels = await StockLevel.find({
        productId: product._id,
        warehouseId: new mongoose.Types.ObjectId(warehouseId),
      });
      totalQuantity = stockLevels.reduce((sum, sl) => sum + sl.quantity, 0);
    } else {
      const stockLevels = await StockLevel.find({ productId: product._id });
      totalQuantity = stockLevels.reduce((sum, sl) => sum + sl.quantity, 0);
    }
    if (totalQuantity < product.reorderLevel) {
      lowStockCount++;
    }
  }

  // Pending requisitions
  const pendingRequisitionsQuery: any = { status: 'SUBMITTED' };
  if (warehouseId) {
    pendingRequisitionsQuery.requestingWarehouseId = new mongoose.Types.ObjectId(warehouseId);
  }
  const pendingRequisitions = await Requisition.countDocuments(pendingRequisitionsQuery);

  // Pending transfers
  const pendingTransfersQuery: any = {
    status: { $in: ['DRAFT', 'IN_TRANSIT'] },
  };
  if (warehouseId) {
    pendingTransfersQuery.$or = [
      { sourceWarehouseId: new mongoose.Types.ObjectId(warehouseId) },
      { targetWarehouseId: new mongoose.Types.ObjectId(warehouseId) },
    ];
  }
  const pendingTransfers = await Transfer.countDocuments(pendingTransfersQuery);

  // Slow/Dead stock (simplified - count products with no movement in last 90 days)
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const activeProducts = await StockMovement.distinct('productId', {
    createdAt: { $gte: ninetyDaysAgo },
  });

  const allProductsWithStock = await StockLevel.distinct('productId');
  const slowDeadStockCount = allProductsWithStock.filter(
    (pid) => !activeProducts.some((ap) => ap.toString() === pid.toString())
  ).length;

  // Stockout events in last 30 days (simplified)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const stockoutEvents = await StockMovement.countDocuments({
    type: 'DELIVERY',
    createdAt: { $gte: thirtyDaysAgo },
  });

  return {
    totalSKUs,
    lowStockCount,
    pendingRequisitions,
    pendingTransfers,
    slowDeadStockCount,
    stockoutEvents,
  };
}

