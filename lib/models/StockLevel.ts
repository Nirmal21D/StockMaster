import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStockLevel extends Document {
  _id: string;
  productId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  locationId?: mongoose.Types.ObjectId;
  quantity: number;
  updatedAt: Date;
}

const StockLevelSchema = new Schema<IStockLevel>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
    },
    quantity: { type: Number, required: true, default: 0 },
  },
  {
    timestamps: { createdAt: false, updatedAt: true },
  }
);

StockLevelSchema.index({ productId: 1, warehouseId: 1, locationId: 1 }, { unique: true });
StockLevelSchema.index({ productId: 1, warehouseId: 1 });

const StockLevel: Model<IStockLevel> =
  mongoose.models.StockLevel || mongoose.model<IStockLevel>('StockLevel', StockLevelSchema);

export default StockLevel;

