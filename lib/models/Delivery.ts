import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IDeliveryLine {
  productId: mongoose.Types.ObjectId;
  fromLocationId?: mongoose.Types.ObjectId;
  quantity: number;
}

export interface IDelivery extends Document {
  _id: string;
  deliveryNumber: string;
  customerName?: string;
  deliveryAddress?: string;
  warehouseId: mongoose.Types.ObjectId;
  status: 'DRAFT' | 'WAITING' | 'READY' | 'DONE';
  reference?: string;
  notes?: string;
  lines: IDeliveryLine[];
  createdBy: mongoose.Types.ObjectId;
  validatedBy?: mongoose.Types.ObjectId;
  scheduleDate?: Date;
  responsible?: string;
  createdAt: Date;
  updatedAt: Date;
  validatedAt?: Date;
}

const DeliveryLineSchema = new Schema<IDeliveryLine>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    fromLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
    },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const DeliverySchema = new Schema<IDelivery>(
  {
    deliveryNumber: { type: String, required: true, unique: true },
    customerName: { type: String },
    deliveryAddress: { type: String },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'WAITING', 'READY', 'DONE'],
      default: 'DRAFT',
    },
    reference: { type: String },
    notes: { type: String },
    lines: [DeliveryLineSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    validatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    scheduleDate: { type: Date },
    responsible: { type: String },
    validatedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

DeliverySchema.index({ warehouseId: 1 });
DeliverySchema.index({ status: 1 });
DeliverySchema.index({ createdAt: -1 });

const Delivery: Model<IDelivery> =
  mongoose.models.Delivery || mongoose.model<IDelivery>('Delivery', DeliverySchema);

export default Delivery;

