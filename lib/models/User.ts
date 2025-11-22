import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IUser extends Document {
  _id: string;
  name: string;
  email: string;
  emailVerified?: Date | null;
  image?: string | null;
  password?: string;
  role: 'ADMIN' | 'OPERATOR' | 'MANAGER';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    emailVerified: { type: Date, default: null },
    image: { type: String, default: null },
    password: { type: String },
    role: {
      type: String,
      enum: ['ADMIN', 'OPERATOR', 'MANAGER'],
      required: true,
      default: 'OPERATOR',
    },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

UserSchema.index({ role: 1 });

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;

