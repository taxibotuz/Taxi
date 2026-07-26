import mongoose, { Document, Schema } from 'mongoose';

export interface IRestaurant extends Document {
  name: string;
  description: string;
  logo?: string;
  coverImage?: string;
  ownerId: mongoose.Types.ObjectId;
  location: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
  phone: string;
  categories: mongoose.Types.ObjectId[];
  rating: number;
  totalOrders: number;
  isActive: boolean;
  isOpen: boolean;
  workingHours: {
    open: string;
    close: string;
  };
  deliveryFee: number;
  minOrderAmount: number;
  estimatedDeliveryTime: number;
  cuisine: string[];
  isApproved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const restaurantSchema = new Schema<IRestaurant>(
  {
    name: { type: String, required: true },
    description: { type: String },
    logo: { type: String },
    coverImage: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
      address: { type: String, required: true },
    },
    phone: { type: String, required: true },
    categories: [{ type: Schema.Types.ObjectId, ref: 'Category' }],
    rating: { type: Number, default: 0, min: 0, max: 5 },
    totalOrders: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    isOpen: { type: Boolean, default: false },
    workingHours: {
      open: { type: String, default: '09:00' },
      close: { type: String, default: '23:00' },
    },
    deliveryFee: { type: Number, default: 5000 },
    minOrderAmount: { type: Number, default: 30000 },
    estimatedDeliveryTime: { type: Number, default: 30 },
    cuisine: [{ type: String }],
    isApproved: { type: Boolean, default: false },
  },
  { timestamps: true }
);

restaurantSchema.index({ 'location': '2dsphere' });
restaurantSchema.index({ isActive: 1, isApproved: 1 });

export const Restaurant = mongoose.model<IRestaurant>('Restaurant', restaurantSchema);
