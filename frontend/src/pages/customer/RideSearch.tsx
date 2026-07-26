import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRideStore } from '../../store/rideStore';
import { ridesApi } from '../../services/api';
import { connectSocket, subscribeToRideUpdates, subscribeToDriverLocation } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import MapView from '../../components/ui/MapView';

export default function RideSearch() {
  const navigate = useNavigate();
  const { pickup, destination, currentOrder, setCurrentOrder, setIsSearching, isSearching, priceEstimate, setPriceEstimate } = useRideStore();
  const token = useAuthStore((s) => s.token);
  const [step, setStep] = useState<'price' | 'searching' | 'found' | 'completed'>('price');
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [offeredPrice, setOfferedPrice] = useState<number>(0);

  useEffect(() => {
    if (!pickup || !destination) {
      navigate('/');
      return;
    }

    const distance = calcDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const duration = Math.round(distance * 2 + 3); // 3 min base + 2 min/km (~30 km/h avg)

    ridesApi.estimatePrice({ distance, duration }).then(({ data }) => {
      setPriceEstimate(data.price);
      setOfferedPrice(data.price.total);
    });
  }, []);

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);

    const unsubRide = subscribeToRideUpdates((data) => {
      if (data.status === 'found' || data.rideId) {
        setStep('found');
        setIsSearching(false);
      }
      if (data.status === 'timeout') {
        toast.error('No drivers found. Try again.');
        setIsSearching(false);
        setStep('price');
      }
    });

    const unsubLoc = subscribeToDriverLocation((data) => {
      setDriverLocation({ lat: data.lat, lng: data.lng });
    });

    return () => {
      unsubRide();
      unsubLoc();
    };
  }, [token]);

  const handleOrderRide = async () => {
    if (!pickup || !destination || !priceEstimate) return;

    const distance = calcDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const duration = Math.round(distance * 2 + 3);

    try {
      const { data } = await ridesApi.createOrder({
        pickupLat: pickup.lat,
        pickupLng: pickup.lng,
        pickupAddress: pickup.address,
        destLat: destination.lat,
        destLng: destination.lng,
        destAddress: destination.address,
        distance,
        duration,
        paymentMethod,
        offeredPrice,
      });

      setCurrentOrder(data.order);
      setStep('searching');
      setIsSearching(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create order');
    }
  };

  const selectedMethod = (method: string) => paymentMethod === method ? 'bg-primary-500 text-white' : 'bg-white/10 text-white';

  const paymentMethods = [
    { value: 'cash', label: '💵 Cash', desc: 'Pay cash to driver' },
    { value: 'click', label: '🔵 Click', desc: 'Pay with Click' },
    { value: 'payme', label: '🟢 Payme', desc: 'Pay with Payme' },
    { value: 'uzum', label: '🟣 Uzum', desc: 'Pay with Uzum' },
    { value: 'card', label: '💳 Card', desc: 'Pay by card' },
    { value: 'wallet', label: '👛 Wallet', desc: 'TaxiGo Wallet' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0a0a1a]">
      <div className="relative flex-1">
        <MapView
          center={pickup ? [pickup.lat, pickup.lng] : undefined}
          pickup={pickup}
          destination={destination}
          driverLocation={step === 'found' ? driverLocation : null}
        />

        <div className="absolute top-4 left-4 z-10">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white"
          >
            ←
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {step === 'price' && priceEstimate && (
          <motion.div
            key="price"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="glass rounded-t-3xl p-5 space-y-4"
          >
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Price Breakdown</h2>
              <span className="text-2xl font-bold text-primary-500">
                {priceEstimate.total.toLocaleString()} sum
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>Base fare</span>
                <span>{priceEstimate.baseFare.toLocaleString()} sum</span>
              </div>
              <div className="flex justify-between">
                <span>Distance</span>
                <span>{priceEstimate.distanceFare.toLocaleString()} sum</span>
              </div>
              <div className="flex justify-between">
                <span>Time</span>
                <span>{priceEstimate.timeFare.toLocaleString()} sum</span>
              </div>
              {priceEstimate.nightSurcharge > 0 && (
                <div className="flex justify-between text-yellow-400">
                  <span>🌙 Night surcharge</span>
                  <span>+{priceEstimate.nightSurcharge.toLocaleString()} sum</span>
                </div>
              )}
              {priceEstimate.rushSurcharge > 0 && (
                <div className="flex justify-between text-orange-400">
                  <span>⚡ Rush surcharge</span>
                  <span>+{priceEstimate.rushSurcharge.toLocaleString()} sum</span>
                </div>
              )}
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                Offer price (optional)
              </label>
              <input
                type="number"
                value={offeredPrice}
                onChange={(e) => setOfferedPrice(Number(e.target.value))}
                className="w-full bg-white/10 rounded-xl p-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">Payment method</label>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setPaymentMethod(m.value)}
                    className={`p-2 rounded-xl text-xs ${selectedMethod(m.value)}`}
                  >
                    <div>{m.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleOrderRide}
              className="w-full py-4 rounded-2xl bg-primary-500 text-white font-semibold text-lg shadow-lg shadow-primary-500/30 active:scale-[0.98] transition-transform"
            >
              Order Taxi — {offeredPrice.toLocaleString()} sum
            </button>
          </motion.div>
        )}

        {step === 'searching' && (
          <motion.div
            key="searching"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="glass rounded-t-3xl p-8 text-center space-y-6"
          >
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-primary-500 searching-ripple" />
                </div>
              </div>
            </div>
            <h2 className="text-xl font-semibold">Searching for drivers...</h2>
            <p className="text-gray-400 text-sm">Looking for nearest available drivers</p>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full bg-primary-500"
                />
              ))}
            </div>
            <button
              onClick={() => {
                setStep('price');
                setIsSearching(false);
              }}
              className="text-red-400 text-sm"
            >
              Cancel search
            </button>
          </motion.div>
        )}

        {step === 'found' && currentOrder && (
          <motion.div
            key="found"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="glass rounded-t-3xl p-5 space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-2xl">
                🚗
              </div>
              <div>
                <h3 className="font-semibold">Driver is on the way!</h3>
                <p className="text-sm text-gray-400">
                  {currentOrder.driverId?.car?.brand} {currentOrder.driverId?.car?.model} • {currentOrder.driverId?.car?.color}
                </p>
              </div>
            </div>

            {driverLocation && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Driver is moving to your location
              </div>
            )}

            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium">
                📞 Call
              </button>
              <button className="flex-1 py-3 rounded-xl bg-primary-500/20 text-primary-400 text-sm font-medium">
                💬 Chat
              </button>
              <button className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium">
                🆘 SOS
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
