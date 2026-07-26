export enum UserRole {
  CUSTOMER = 'customer',
  DRIVER = 'driver',
  ADMIN = 'admin',
}

export enum DriverStatus {
  OFFLINE = 'offline',
  ONLINE = 'online',
  BUSY = 'busy',
  PAUSED = 'paused',
}

export enum RideStatus {
  PENDING = 'pending',
  SEARCHING = 'searching',
  ACCEPTED = 'accepted',
  ARRIVED = 'arrived',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  DISPUTED = 'disputed',
}

export enum PaymentMethod {
  CASH = 'cash',
  CLICK = 'click',
  PAYME = 'payme',
  UZUM = 'uzum',
  CARD = 'card',
  WALLET = 'wallet',
}

export enum OrderType {
  RIDE = 'ride',
  DELIVERY = 'delivery',
}

export interface Location {
  type: 'Point';
  coordinates: [number, number];
  address?: string;
}

export interface PriceBreakdown {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  surgeMultiplier: number;
  nightSurcharge: number;
  rushSurcharge: number;
  airportFee: number;
  total: number;
}

export interface DriverSearchResult {
  driverId: string;
  distance: number;
  eta: number;
}

export interface RideRequest {
  customerId: string;
  pickup: Location;
  destination: Location;
  paymentMethod: PaymentMethod;
  comment?: string;
  offeredPrice?: number;
  promoCode?: string;
}

export interface SocketEvents {
  'location:update': { driverId: string; lat: number; lng: number };
  'ride:request': { rideId: string; customerId: string; pickup: Location; destination: Location; price: number };
  'ride:accepted': { rideId: string; driverId: string; driverInfo: any };
  'ride:arrived': { rideId: string };
  'ride:started': { rideId: string };
  'ride:completed': { rideId: string };
  'ride:cancelled': { rideId: string; reason?: string };
  'driver:location': { driverId: string; lat: number; lng: number; timestamp: number };
  'search:status': { rideId: string; status: 'searching' | 'found' | 'timeout' };
  'admin:driver:update': { driverId: string; status: string };
}
