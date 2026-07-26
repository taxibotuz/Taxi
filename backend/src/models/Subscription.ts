import mongoose, { Document, Schema } from 'mongoose';

export type SubscriptionStatus = 'active' | 'expired' | 'cancelled' | 'pending_payment';

export interface ISubscription extends Document {
  driverId: mongoose.Types.ObjectId;
  planId: mongoose.Types.ObjectId;
  status: SubscriptionStatus;
  startsAt: Date;
  expiresAt: Date;
  paymentMethod?: string;
  paymentAmount?: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  autoRenew: boolean;
  reminderSent: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>(
  {
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver', required: true },
    planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan', required: true },
    status: {
      type: String,
      enum: ['active', 'expired', 'cancelled', 'pending_payment'],
      default: 'pending_payment',
    },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    paymentMethod: { type: String },
    paymentAmount: { type: Number },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    autoRenew: { type: Boolean, default: false },
    reminderSent: { type: Boolean, default: false },
  },
  { timestamps: true }
);

subscriptionSchema.index({ driverId: 1, status: 1 });
subscriptionSchema.index({ expiresAt: 1, status: 1 });
subscriptionSchema.index({ driverId: 1, expiresAt: -1 });

export const Subscription = mongoose.model<ISubscription>('Subscription', subscriptionSchema);
