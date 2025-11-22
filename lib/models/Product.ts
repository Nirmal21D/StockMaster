import mongoose, { Schema, Document, Model } from 'mongoose';

export interface IProduct extends Document {
  _id: string;
  name: string;
  sku: string;
  category?: string;
  unit: string;
  price?: number;
  reorderLevel: number;
  abcClass?: 'A' | 'B' | 'C';
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    sku: { type: String, required: true, unique: true },
    category: { type: String },
    unit: { type: String, required: true, default: 'pcs' },
    price: { type: Number },
    reorderLevel: { type: Number, required: true, default: 0 },
    abcClass: { type: String, enum: ['A', 'B', 'C'] },
    isActive: { type: Boolean, default: true },
  },
  {
    timestamps: true,
  }
);

ProductSchema.index({ category: 1 });
ProductSchema.index({ abcClass: 1 });

const Product: Model<IProduct> =
  mongoose.models.Product || mongoose.model<IProduct>('Product', ProductSchema);

export default Product;

