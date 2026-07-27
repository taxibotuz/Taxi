export interface User {
  _id: string;
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  photoUrl?: string;
  role: 'customer' | 'driver' | 'admin';
  phone?: string;
  language: string;
  isBanned: boolean;
  isActive: boolean;
}

export interface Driver {
  _id: string;
  userId: User;
  status: 'offline' | 'online' | 'busy' | 'paused';
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
  rating: number;
  totalRides: number;
  totalEarnings: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  currentLocation: {
    type: 'Point';
    coordinates: [number, number];
  };
}

export interface Order {
  _id: string;
  orderNumber: string;
  type: 'ride' | 'delivery';
  customerId: User;
  driverId?: Driver;
  status: 'pending' | 'searching' | 'accepted' | 'arrived' | 'in_progress' | 'completed' | 'cancelled' | 'disputed';
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
  paymentMethod: 'cash';
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  comment?: string;
  offeredPrice?: number;
  createdAt: string;
}

export interface PriceEstimate {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  nightSurcharge: number;
  rushSurcharge: number;
  airportFee: number;
  total: number;
}

export interface PromoCode {
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  maxDiscount?: number;
  minOrderAmount?: number;
}

export interface Notification {
  _id: string;
  userId: string;
  title: string;
  body: string;
  type: 'order' | 'payment' | 'promo' | 'system';
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: string;
}

export interface Restaurant {
  _id: string;
  name: string;
  description: string;
  logo?: string;
  location: {
    coordinates: [number, number];
    address: string;
  };
  rating: number;
  isOpen: boolean;
  deliveryFee: number;
  minOrderAmount: number;
  estimatedDeliveryTime: number;
  cuisine: string[];
  categories: Category[];
}

export interface Category {
  _id: string;
  name: string;
  image?: string;
}

export interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  discountPrice?: number;
  images: string[];
  categoryId: string;
  restaurantId: string;
  isAvailable: boolean;
  preparationTime: number;
}

export interface Settings {
  _id?: string;
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
    enabledMethods: string[];
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
}

export type RideStatus = Order['status'];
export type PaymentMethod = Order['paymentMethod'];
