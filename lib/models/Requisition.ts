import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IRequisitionLine {
  productId: mongoose.Types.ObjectId;
  quantityRequested: number;
  neededByDate?: Date;
}

export interface IRequisition extends Document {
  _id: string;
  requisitionNumber: string;
  requestingWarehouseId: mongoose.Types.ObjectId;
  suggestedSourceWarehouseId?: mongoose.Types.ObjectId;
  finalSourceWarehouseId?: mongoose.Types.ObjectId;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  lines: IRequisitionLine[];
  createdBy: mongoose.Types.ObjectId;
  approvedBy?: mongoose.Types.ObjectId;
  rejectedReason?: string;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
}

const RequisitionLineSchema = new Schema<IRequisitionLine>(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    quantityRequested: { type: Number, required: true, min: 1 },
    neededByDate: { type: Date },
  },
  { _id: false }
);

const RequisitionSchema = new Schema<IRequisition>(
  {
    requisitionNumber: { type: String, required: true, unique: true },
    requestingWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    suggestedSourceWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    finalSourceWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
    },
    status: {
      type: String,
      enum: ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED'],
      default: 'DRAFT',
    },
    lines: [RequisitionLineSchema],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    approvedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    rejectedReason: { type: String },
    approvedAt: { type: Date },
  },
  {
    timestamps: true,
  }
);

RequisitionSchema.index({ requestingWarehouseId: 1 });
RequisitionSchema.index({ status: 1 });
RequisitionSchema.index({ createdAt: -1 });

const Requisition: Model<IRequisition> =
  mongoose.models.Requisition || mongoose.model<IRequisition>('Requisition', RequisitionSchema);

export default Requisition;

