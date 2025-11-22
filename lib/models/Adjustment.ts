import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IAdjustment extends Document {
  _id: mongoose.Types.ObjectId;
  adjustmentNumber: string;
  productId: mongoose.Types.ObjectId;
  warehouseId: mongoose.Types.ObjectId;
  locationId?: mongoose.Types.ObjectId;
  oldQuantity: number;
  newQuantity: number;
  difference: number;
  reason: 'DAMAGE' | 'LOSS' | 'COUNT_ERROR' | 'OTHER';
  remarks?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
}

const AdjustmentSchema = new Schema<IAdjustment>(
  {
    adjustmentNumber: { type: String, required: true, unique: true },
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
    oldQuantity: { type: Number, required: true },
    newQuantity: { type: Number, required: true },
    difference: { type: Number, required: true },
    reason: {
      type: String,
      enum: ['DAMAGE', 'LOSS', 'COUNT_ERROR', 'OTHER'],
      required: true,
    },
    remarks: { type: String },
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

AdjustmentSchema.index({ productId: 1 });
AdjustmentSchema.index({ warehouseId: 1 });
AdjustmentSchema.index({ createdAt: -1 });

const Adjustment: Model<IAdjustment> =
  mongoose.models.Adjustment || mongoose.model<IAdjustment>('Adjustment', AdjustmentSchema);

export default Adjustment;

