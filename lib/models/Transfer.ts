import mongoose, { Schema, Document, Model } from 'mongoose';

export interface ITransferLine {
  productId: mongoose.Types.ObjectId;
  sourceLocationId?: mongoose.Types.ObjectId;
  targetLocationId?: mongoose.Types.ObjectId;
  quantity: number;
}

export interface ITransfer extends Document {
  _id: mongoose.Types.ObjectId;
  transferNumber: string;
  requisitionId?: mongoose.Types.ObjectId;
  deliveryId?: mongoose.Types.ObjectId; // Link to delivery
  sourceWarehouseId: mongoose.Types.ObjectId;
  targetWarehouseId: mongoose.Types.ObjectId;
  status: 'DRAFT' | 'IN_TRANSIT' | 'DONE';
  lines: ITransferLine[];
  createdBy: mongoose.Types.ObjectId;
  validatedBy?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
  dispatchedAt?: Date;
  receivedAt?: Date;
}

const TransferLineSchema = new Schema<ITransferLine>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    sourceLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
    },
    targetLocationId: {
      type: Schema.Types.ObjectId,
      ref: 'Location',
    },
    quantity: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const TransferSchema = new Schema<ITransfer>(
  {
    transferNumber: { type: String, required: true, unique: true },
    requisitionId: {
      type: Schema.Types.ObjectId,
      ref: 'Requisition',
    },
    deliveryId: {
      type: Schema.Types.ObjectId,
      ref: 'Delivery',
    },
    sourceWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    targetWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    status: {
      type: String,
      enum: ['DRAFT', 'IN_TRANSIT', 'DONE'],
      default: 'DRAFT',
    },
    lines: [TransferLineSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    validatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    dispatchedAt: { type: Date },
    receivedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

TransferSchema.index({ sourceWarehouseId: 1 });
TransferSchema.index({ targetWarehouseId: 1 });
TransferSchema.index({ status: 1 });
TransferSchema.index({ requisitionId: 1 });
TransferSchema.index({ deliveryId: 1 });

const Transfer: Model<ITransfer> =
  mongoose.models.Transfer || mongoose.model<ITransfer>('Transfer', TransferSchema);

export default Transfer;

