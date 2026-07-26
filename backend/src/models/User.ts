import mongoose, { Document, Schema } from 'mongoose';
import { UserRole } from '../types';

export interface IUser extends Document {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  role: UserRole;
  phone?: string;
  language: string;
  isBanned: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    telegramId: { type: Number, required: true, unique: true, index: true },
    firstName: { type: String, required: true },
    lastName: { type: String },
    username: { type: String },
    photoUrl: { type: String },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
    },
    phone: { type: String },
    language: { type: String, default: 'uz' },
    isBanned: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

userSchema.index({ role: 1 });

export const User = mongoose.model<IUser>('User', userSchema);
