import mongoose, { Document, Schema } from 'mongoose';
import { DriverStatus } from '../types';

export interface IDriver extends Document {
  userId: mongoose.Types.ObjectId;
  status: DriverStatus;
  isApproved: boolean;
  isOnline: boolean;
  car: {
    brand: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    seats: number;
  };
  documents: {
    passport: string;
    driverLicense: string;
    carDocument: string;
    isVerified: boolean;
  };
  currentLocation: {
    type: 'Point';
    coordinates: [number, number];
    updatedAt: Date;
  };
  rating: number;
  totalRides: number;
  totalEarnings: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  isAvailable: boolean;
  isSuspended: boolean;
  isBlacklisted: boolean;
  subscription: {
    active: boolean;
    planId?: mongoose.Types.ObjectId;
    expiresAt?: Date;
  };
  createdAt: Date;
  updatedAt: Date;
}

const driverSchema = new Schema<IDriver>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    status: {
      type: String,
      enum: Object.values(DriverStatus),
      default: DriverStatus.OFFLINE,
    },
    isApproved: { type: Boolean, default: false },
    isOnline: { type: Boolean, default: false },
    car: {
      brand: { type: String, required: true },
      model: { type: String, required: true },
      year: { type: Number, required: true },
      color: { type: String, required: true },
      plateNumber: { type: String, required: true },
      seats: { type: Number, default: 4 },
    },
    documents: {
      passport: { type: String },
      driverLicense: { type: String },
      carDocument: { type: String },
      isVerified: { type: Boolean, default: false },
    },
    currentLocation: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], default: [0, 0] },
      updatedAt: { type: Date, default: Date.now },
    },
    rating: { type: Number, default: 5.0, min: 0, max: 5 },
    totalRides: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 },
    todayEarnings: { type: Number, default: 0 },
    weeklyEarnings: { type: Number, default: 0 },
    monthlyEarnings: { type: Number, default: 0 },
    isAvailable: { type: Boolean, default: false },
    isSuspended: { type: Boolean, default: false },
    isBlacklisted: { type: Boolean, default: false },
    subscription: {
      active: { type: Boolean, default: false },
      planId: { type: Schema.Types.ObjectId, ref: 'SubscriptionPlan' },
      expiresAt: { type: Date },
    },
  },
  { timestamps: true }
);

driverSchema.index({ 'currentLocation': '2dsphere' });
driverSchema.index({ status: 1, isOnline: 1, isAvailable: 1 });
driverSchema.index({ isApproved: 1 });

export const Driver = mongoose.model<IDriver>('Driver', driverSchema);
