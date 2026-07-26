import mongoose, { Document, Schema } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  categoryId: mongoose.Types.ObjectId;
  restaurantId: mongoose.Types.ObjectId;
  isAvailable: boolean;
  isFeatured: boolean;
  preparationTime: number;
  ingredients: string[];
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  rating: number;
  totalOrders: number;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true },
    description: { type: String },
    price: { type: Number, required: true },
    discountPrice: { type: Number },
    images: [{ type: String }],
    categoryId: { type: Schema.Types.ObjectId, ref: 'Category', required: true },
    restaurantId: { type: Schema.Types.ObjectId, ref: 'Restaurant', required: true },
    isAvailable: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    preparationTime: { type: Number, default: 10 },
    ingredients: [{ type: String }],
    nutritionalInfo: {
      calories: { type: Number },
      protein: { type: Number },
      carbs: { type: Number },
      fat: { type: Number },
    },
    rating: { type: Number, default: 0 },
    totalOrders: { type: Number, default: 0 },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

productSchema.index({ restaurantId: 1, categoryId: 1 });
productSchema.index({ isAvailable: 1 });

export const Product = mongoose.model<IProduct>('Product', productSchema);
