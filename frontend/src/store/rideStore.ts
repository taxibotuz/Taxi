import { create } from 'zustand';
import { Order, PriceEstimate } from '../types';

interface RideState {
  currentOrder: Order | null;
  orders: Order[];
  priceEstimate: PriceEstimate | null;
  pickup: { lat: number; lng: number; address: string } | null;
  destination: { lat: number; lng: number; address: string } | null;
  isSearching: boolean;
  setCurrentOrder: (order: Order | null) => void;
  setOrders: (orders: Order[]) => void;
  setPriceEstimate: (price: PriceEstimate | null) => void;
  setPickup: (location: { lat: number; lng: number; address: string } | null) => void;
  setDestination: (location: { lat: number; lng: number; address: string } | null) => void;
  setIsSearching: (searching: boolean) => void;
  clearRide: () => void;
}

export const useRideStore = create<RideState>((set) => ({
  currentOrder: null,
  orders: [],
  priceEstimate: null,
  pickup: null,
  destination: null,
  isSearching: false,

  setCurrentOrder: (order) => set({ currentOrder: order }),
  setOrders: (orders) => set({ orders }),
  setPriceEstimate: (price) => set({ priceEstimate: price }),
  setPickup: (location) => set({ pickup: location }),
  setDestination: (location) => set({ destination: location }),
  setIsSearching: (searching) => set({ isSearching: searching }),
  clearRide: () =>
    set({
      currentOrder: null,
      priceEstimate: null,
      pickup: null,
      destination: null,
      isSearching: false,
    }),
}));
