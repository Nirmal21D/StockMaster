import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IReceiptLine {
  productId: mongoose.Types.ObjectId;
  locationId?: mongoose.Types.ObjectId;
  quantity: number;
}

export interface IReceipt extends Document {
  _id: mongoose.Types.ObjectId;
  receiptNumber: string;
  supplierName?: string;
  warehouseId: mongoose.Types.ObjectId;
  status: 'DRAFT' | 'WAITING' | 'DONE';
  reference?: string;
  notes?: string;
  lines: IReceiptLine[];
  createdBy: mongoose.Types.ObjectId;
  validatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  validatedAt?: Date;
}

const ReceiptLineSchema = new Schema<IReceiptLine>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    locationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
    },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const ReceiptSchema = new Schema<IReceipt>(
  {
    receiptNumber: { type: String, required: true, unique: true },
    supplierName: { type: String },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'WAITING', 'DONE'],
      default: 'DRAFT',
    },
    reference: { type: String },
    notes: { type: String },
    lines: [ReceiptLineSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    validatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    validatedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

ReceiptSchema.index({ warehouseId: 1 });
ReceiptSchema.index({ status: 1 });
ReceiptSchema.index({ createdAt: -1 });

const Receipt: Model<IReceipt> =
  mongoose.models.Receipt || mongoose.model<IReceipt>('Receipt', ReceiptSchema);

export default Receipt;

