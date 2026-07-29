import mongoose, { Document, Schema } from 'mongoose';
import { PaymentMethod } from '../types';

export interface ISettings extends Document {
  pricing: {
    baseFare: number;
    pricePerKm: number;
    pricePerMinute: number;
    minimumFare: number;
    nightCoefficient: number;
    nightStartHour: number;
    nightEndHour: number;
    rushCoefficient: number;
    holidayCoefficient: number;
    airportFee: number;
    surgeEnabled: boolean;
  };
  search: {
    maxRadius: number;
    searchTimeout: number;
    maxDriversPerSearch: number;
    maxDriversToNotify: number;
    rideExpirySeconds: number;
    expansionStep: number;
    maxExpansions: number;
  };
  driver: {
    commission: number;
    minRating: number;
    maxRidesBeforeBreak: number;
  };
  features: {
    foodDelivery: boolean;
    rideScheduling: boolean;
    referralSystem: boolean;
    sosButton: boolean;
  };
  payment: {
    enabledMethods: PaymentMethod[];
    walletEnabled: boolean;
    cashEnabled: boolean;
  };
  district: {
    enabled: boolean;
    name: string;
    centerLat: number;
    centerLng: number;
    boundary: Array<{ lat: number; lng: number }>;
  };
  maintenance: {
    isEnabled: boolean;
    message: string;
  };
  notifications: {
    pushEnabled: boolean;
    soundEnabled: boolean;
  };
  general: {
    appName: string;
    contactPhone: string;
    supportUrl: string;
    termsUrl: string;
    privacyUrl: string;
    defaultLanguage: string;
    availableLanguages: string[];
  };
  matching: {
    mode: 'nearby' | 'all';
  };
}

const settingsSchema = new Schema<ISettings>({
  pricing: {
    baseFare: { type: Number, default: 5000 },
    pricePerKm: { type: Number, default: 1500 },
    pricePerMinute: { type: Number, default: 200 },
    minimumFare: { type: Number, default: 7000 },
    nightCoefficient: { type: Number, default: 1.5 },
    nightStartHour: { type: Number, default: 22 },
    nightEndHour: { type: Number, default: 6 },
    rushCoefficient: { type: Number, default: 1.3 },
    holidayCoefficient: { type: Number, default: 1.2 },
    airportFee: { type: Number, default: 5000 },
    surgeEnabled: { type: Boolean, default: true },
  },
  search: {
    maxRadius: { type: Number, default: 15 },
    searchTimeout: { type: Number, default: 15 },
    maxDriversPerSearch: { type: Number, default: 10 },
    maxDriversToNotify: { type: Number, default: 5 },
    rideExpirySeconds: { type: Number, default: 30 },
    expansionStep: { type: Number, default: 5 },
    maxExpansions: { type: Number, default: 3 },
  },
  driver: {
    commission: { type: Number, default: 15 },
    minRating: { type: Number, default: 4.0 },
    maxRidesBeforeBreak: { type: Number, default: 12 },
  },
  features: {
    foodDelivery: { type: Boolean, default: false },
    rideScheduling: { type: Boolean, default: false },
    referralSystem: { type: Boolean, default: false },
    sosButton: { type: Boolean, default: true },
  },
  payment: {
    enabledMethods: {
      type: [String],
      enum: Object.values(PaymentMethod),
      default: [PaymentMethod.CASH],
    },
    walletEnabled: { type: Boolean, default: false },
    cashEnabled: { type: Boolean, default: true },
  },
  district: {
    enabled: { type: Boolean, default: true },
    name: { type: String, default: "To'rtko'l tumani" },
    centerLat: { type: Number, default: 41.55 },
    centerLng: { type: Number, default: 61.00 },
    boundary: {
      type: [{ lat: Number, lng: Number }],
      default: [
        { lat: 41.85, lng: 60.40 },
        { lat: 41.88, lng: 60.80 },
        { lat: 41.85, lng: 61.20 },
        { lat: 41.80, lng: 61.55 },
        { lat: 41.55, lng: 61.60 },
        { lat: 41.30, lng: 61.50 },
        { lat: 41.25, lng: 61.00 },
        { lat: 41.28, lng: 60.45 },
        { lat: 41.50, lng: 60.35 },
      ],
    },
  },
  maintenance: {
    isEnabled: { type: Boolean, default: false },
    message: { type: String, default: 'System under maintenance. Please try again later.' },
  },
  notifications: {
    pushEnabled: { type: Boolean, default: true },
    soundEnabled: { type: Boolean, default: true },
  },
  general: {
    appName: { type: String, default: 'TaxiGo' },
    contactPhone: { type: String, default: '+998781234567' },
    supportUrl: { type: String, default: 'https://t.me/taxigo_support' },
    termsUrl: { type: String, default: 'https://taxigo.uz/terms' },
    privacyUrl: { type: String, default: 'https://taxigo.uz/privacy' },
    defaultLanguage: { type: String, default: 'uz' },
    availableLanguages: { type: [String], default: ['uz', 'ru', 'en'] },
  },
  matching: {
    mode: { type: String, enum: ['nearby', 'all'], default: 'nearby' },
  },
});

export const Settings = mongoose.model<ISettings>('Settings', settingsSchema);
