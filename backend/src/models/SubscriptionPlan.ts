import mongoose, { Document, Schema } from 'mongoose';

export interface ISubscriptionPlan extends Document {
  name: string;
  description: string;
  durationDays: number;
  price: number;
  currency: string;
  features: string[];
  maxRidesPerDay: number;
  maxRadius: number;
  commissionDiscount: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionPlanSchema = new Schema<ISubscriptionPlan>(
  {
    name: { type: String, required: true },
    description: { type: String, default: '' },
    durationDays: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'UZS' },
    features: { type: [String], default: [] },
    maxRidesPerDay: { type: Number, default: 0 },
    maxRadius: { type: Number, default: 0 },
    commissionDiscount: { type: Number, default: 0, min: 0, max: 100 },
    isActive: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
  },
  { timestamps: true }
);

subscriptionPlanSchema.index({ isActive: 1, sortOrder: 1 });

export const SubscriptionPlan = mongoose.model<ISubscriptionPlan>('SubscriptionPlan', subscriptionPlanSchema);
