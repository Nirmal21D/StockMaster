import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  password?: string;
  role: 'ADMIN' | 'OPERATOR' | 'MANAGER' | null;
  status: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  assignedWarehouses: mongoose.Types.ObjectId[];
  primaryWarehouseId?: mongoose.Types.ObjectId | null;
  isActive: boolean; // Legacy field, kept for backward compatibility
  resetToken?: string;
  resetTokenExpiry?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    emailVerified: { type: Date, default: null },
    image: { type: String, default: null },
    password: { type: String },
    role: {
      type: String,
      enum: ['ADMIN', 'OPERATOR', 'MANAGER', null],
      default: null,
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'INACTIVE'],
      default: 'PENDING',
    },
    assignedWarehouses: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Warehouse',
      },
    ],
    primaryWarehouseId: {
      type: Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
    },
    isActive: { type: Boolean, default: true },
    resetToken: { type: String, default: undefined },
    resetTokenExpiry: { type: Date, default: undefined },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ role: 1 });
UserSchema.index({ status: 1 });
UserSchema.index({ email: 1 }, { unique: true });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

