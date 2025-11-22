import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ILocation extends Document {
  _id: string;
  warehouseId: mongoose.Types.ObjectId;
  name: string;
  code?: string;
  description?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LocationSchema = new Schema<ILocation>(
  {
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    name: { type: String, required: true },
    code: { type: String },
    description: { type: String },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

LocationSchema.index({ warehouseId: 1 });
LocationSchema.index({ warehouseId: 1, name: 1 });

const Location: Model<ILocation> =
  mongoose.models.Location || mongoose.model<ILocation>('Location', LocationSchema);

export default Location;

