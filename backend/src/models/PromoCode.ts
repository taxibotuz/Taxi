import mongoose, { Document, Schema } from 'mongoose';

export interface IPromoCode extends Document {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
  usageLimit: number;
  usedCount: number;
  perUserLimit: number;
  usedBy: mongoose.Types.ObjectId[];
  isActive: boolean;
  startsAt: Date;
  expiresAt: Date;
  applicableTo: ('ride' | 'delivery')[];
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const promoSchema = new Schema<IPromoCode>(
  {
    code: { type: String, required: true, unique: true, uppercase: true },
    description: { type: String },
    discountType: { type: String, enum: ['percentage', 'fixed'], required: true },
    discountValue: { type: Number, required: true },
    maxDiscount: { type: Number },
    minOrderAmount: { type: Number, default: 0 },
    usageLimit: { type: Number, default: 100 },
    usedCount: { type: Number, default: 0 },
    perUserLimit: { type: Number, default: 1 },
    usedBy: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    isActive: { type: Boolean, default: true },
    startsAt: { type: Date, required: true },
    expiresAt: { type: Date, required: true },
    applicableTo: { type: [String], default: ['ride'] },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

promoSchema.index({ isActive: 1, expiresAt: 1 });

export const PromoCode = mongoose.model<IPromoCode>('PromoCode', promoSchema);
