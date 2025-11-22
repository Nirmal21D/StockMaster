import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IStockMovement extends Document {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  warehouseFromId?: mongoose.Types.ObjectId;
  locationFromId?: mongoose.Types.ObjectId;
  warehouseToId?: mongoose.Types.ObjectId;
  locationToId?: mongoose.Types.ObjectId;
  change: number;
  type: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT';
  documentType: 'RECEIPT' | 'DELIVERY' | 'TRANSFER' | 'ADJUSTMENT';
  documentId: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const StockMovementSchema = new Schema<IStockMovement>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    warehouseFromId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    locationFromId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
    },
    warehouseToId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    locationToId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
    },
    change: { type: Number, required: true },
    type: {
      type: String,
      enum: ['RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT'],
      required: true,
    },
    documentType: {
      type: String,
      enum: ['RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT'],
      required: true,
    },
    documentId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

StockMovementSchema.index({ productId: 1 });
StockMovementSchema.index({ warehouseFromId: 1 });
StockMovementSchema.index({ warehouseToId: 1 });
StockMovementSchema.index({ type: 1 });
StockMovementSchema.index({ createdAt: -1 });

const StockMovement: Model<IStockMovement> =
  mongoose.models.StockMovement ||
  mongoose.model<IStockMovement>('StockMovement', StockMovementSchema);

export default StockMovement;

