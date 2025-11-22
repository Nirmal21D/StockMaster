import StockLevel from '../models/StockLevel';
import StockMovement from '../models/StockMovement';
import mongoose from 'mongoose';

/**
 * Update stock level and create ledger entry
 * This is the core function that all stock-changing operations should use
 */
export async function updateStock(
  productId: mongoose.Types.ObjectId,
  warehouseId: mongoose.Types.ObjectId,
  locationId: mongoose.Types.ObjectId | undefined,
  quantityChange: number,
  type: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT',
  documentType: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT',
  documentId: mongoose.Types.ObjectId,
  createdBy: mongoose.Types.ObjectId,
  warehouseFromId?: mongoose.Types.ObjectId,
  locationFromId?: mongoose.Types.ObjectId,
  warehouseToId?: mongoose.Types.ObjectId,
  locationToId?: mongoose.Types.ObjectId
) {
  // Update or create stock level
  const stockLevel = await StockLevel.findOneAndUpdate(
    {
      productId,
      warehouseId,
      locationId: locationId || null,
    },
    {
      $inc: { quantity: quantityChange },
    },
    {
      upsert: true,
      new: true,
    }
  );

  // Create ledger entry
  await StockMovement.create({
    productId,
    warehouseFromId,
    locationFromId,
    warehouseToId,
    locationToId,
    change: quantityChange,
    type,
    documentType,
    documentId,
    createdBy,
  });

  return stockLevel;
}

/**
 * Get available stock for a product in a warehouse
 */
export async function getAvailableStock(
  productId: mongoose.Types.ObjectId,
  warehouseId: mongoose.Types.ObjectId,
  locationId?: mongoose.Types.ObjectId
): Promise<number> {
  const query: any = {
    productId,
    warehouseId,
  };

  if (locationId) {
    query.locationId = locationId;
  } else {
    query.locationId = null;
  }

  const stockLevel = await StockLevel.findOne(query);
  return stockLevel?.quantity || 0;
}

/**
 * Check if sufficient stock is available
 */
export async function checkStockAvailability(
  productId: mongoose.Types.ObjectId,
  warehouseId: mongoose.Types.ObjectId,
  requiredQuantity: number,
  locationId?: mongoose.Types.ObjectId
): Promise<{ available: boolean; availableQuantity: number }> {
  const availableQuantity = await getAvailableStock(productId, warehouseId, locationId);
  return {
    available: availableQuantity >= requiredQuantity,
    availableQuantity,
  };
}

