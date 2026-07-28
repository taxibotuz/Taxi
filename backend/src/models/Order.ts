import mongoose, { Document, Schema } from 'mongoose';
import { RideStatus, PaymentMethod, OrderType } from '../types';
import './Counter';

export interface IOrder extends Document {
  orderNumber: string;
  type: OrderType;
  customerId: mongoose.Types.ObjectId;
  driverId?: mongoose.Types.ObjectId;
  status: RideStatus;
  pickup: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
  destination: {
    type: 'Point';
    coordinates: [number, number];
    address: string;
  };
  distance: number;
  duration: number;
  pricing: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    surgeMultiplier: number;
    nightSurcharge: number;
    rushSurcharge: number;
    airportFee: number;
    subtotal: number;
    discount: number;
    promoCode?: string;
    total: number;
  };
  paymentMethod: PaymentMethod;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  comment?: string;
  offeredPrice?: number;
  customerRating?: number;
  driverRating?: number;
  customerComment?: string;
  driverComment?: string;
  cancelledBy?: 'customer' | 'driver' | 'system' | 'admin';
  cancelReason?: string;
  searchedDrivers: mongoose.Types.ObjectId[];
  rejectedDrivers: mongoose.Types.ObjectId[];
  acceptedAt?: Date;
  arrivedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
  isDisputed: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const orderSchema = new Schema<IOrder>(
  {
    orderNumber: { type: String, unique: true },
    type: {
      type: String,
      enum: Object.values(OrderType),
      default: OrderType.RIDE,
    },
    customerId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    driverId: { type: Schema.Types.ObjectId, ref: 'Driver' },
    status: {
      type: String,
      enum: Object.values(RideStatus),
      default: RideStatus.PENDING,
    },
    pickup: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
      address: { type: String, required: true },
    },
    destination: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true },
      address: { type: String, required: true },
    },
    distance: { type: Number, default: 0 },
    duration: { type: Number, default: 0 },
    pricing: {
      baseFare: { type: Number, default: 0 },
      distanceFare: { type: Number, default: 0 },
      timeFare: { type: Number, default: 0 },
      surgeMultiplier: { type: Number, default: 1 },
      nightSurcharge: { type: Number, default: 0 },
      rushSurcharge: { type: Number, default: 0 },
      airportFee: { type: Number, default: 0 },
      subtotal: { type: Number, default: 0 },
      discount: { type: Number, default: 0 },
      promoCode: { type: String },
      total: { type: Number, default: 0 },
    },
    paymentMethod: {
      type: String,
      enum: Object.values(PaymentMethod),
      default: PaymentMethod.CASH,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    comment: { type: String },
    offeredPrice: { type: Number },
    customerRating: { type: Number, min: 0, max: 5 },
    driverRating: { type: Number, min: 0, max: 5 },
    customerComment: { type: String },
    driverComment: { type: String },
    cancelledBy: { type: String, enum: ['customer', 'driver', 'system', 'admin'] },
    cancelReason: { type: String },
    searchedDrivers: [{ type: Schema.Types.ObjectId, ref: 'Driver' }],
    rejectedDrivers: [{ type: Schema.Types.ObjectId, ref: 'Driver' }],
    acceptedAt: { type: Date },
    arrivedAt: { type: Date },
    startedAt: { type: Date },
    completedAt: { type: Date },
    cancelledAt: { type: Date },
    isDisputed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ driverId: 1, createdAt: -1 });
orderSchema.index({ status: 1 });
orderSchema.index({ 'pickup': '2dsphere' });
orderSchema.index({ 'destination': '2dsphere' });

orderSchema.pre('save', async function (next) {
  if (!this.orderNumber) {
    const Counter = mongoose.model('Counter');
    const date = new Date();
    const datePrefix = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
    const counter = await Counter.findOneAndUpdate(
      { _id: `order_${datePrefix}` },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.orderNumber = `TXG${datePrefix}${String(counter.seq).padStart(6, '0')}`;
  }
  next();
});

export const Order = mongoose.model<IOrder>('Order', orderSchema);
