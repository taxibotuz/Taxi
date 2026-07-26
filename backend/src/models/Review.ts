import mongoose, { Document, Schema } from 'mongoose';

export interface IReview extends Document {
  orderId: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  isModerated: boolean;
  isApproved: boolean;
  type: 'customer_to_driver' | 'driver_to_customer';
  createdAt: Date;
  updatedAt: Date;
}

const reviewSchema = new Schema<IReview>(
  {
    orderId: { type: Schema.Types.ObjectId, ref: 'Order', required: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, maxlength: 500 },
    isModerated: { type: Boolean, default: false },
    isApproved: { type: Boolean, default: true },
    type: { type: String, enum: ['customer_to_driver', 'driver_to_customer'], required: true },
  },
  { timestamps: true }
);

reviewSchema.index({ orderId: 1 });
reviewSchema.index({ toUserId: 1 });
reviewSchema.index({ fromUserId: 1 });

export const Review = mongoose.model<IReview>('Review', reviewSchema);
