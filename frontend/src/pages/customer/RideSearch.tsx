import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRideStore } from '../../store/rideStore';
import { ridesApi } from '../../services/api';
import { connectSocket, subscribeToDriverLocation, getSocket } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import MapView from '../../components/ui/MapView';
import { isInsideDistrict, getDefaultCenter, districtConfig } from '../../services/geo';
import { useTranslation } from '../../i18n';

export default function RideSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pickup, destination, currentOrder, setCurrentOrder, setIsSearching, isSearching, priceEstimate, setPriceEstimate } = useRideStore();
  const token = useAuthStore((s) => s.token);
  const [step, setStep] = useState<'price' | 'searching' | 'found' | 'riding' | 'completed'>('price');
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [offeredPrice, setOfferedPrice] = useState<number>(0);
  const [mapCenter, setMapCenter] = useState<[number, number]>([getDefaultCenter().lat, getDefaultCenter().lng]);

  const pickupInside = pickup ? isInsideDistrict(pickup) : false;
  const destInside = destination ? isInsideDistrict(destination) : false;

  useEffect(() => {
    if (!pickup || !destination) { navigate('/'); return; }
    const distance = calcDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const duration = Math.round(distance * 2 + 3);
    ridesApi.estimatePrice({ distance, duration }).then(({ data }) => {
      setPriceEstimate(data.price);
      setOfferedPrice(data.price.total);
    }).catch(() => {
      toast.error(t('failed_get_estimate'));
    });
  }, []);

  useEffect(() => {
    if (pickup) setMapCenter([pickup.lat, pickup.lng]);
    else if (destination) setMapCenter([destination.lat, destination.lng]);
  }, [pickup, destination]);

  const route = pickup && destination ? [pickup, destination] : [];
  const distance = pickup && destination ? calcDistance(pickup.lat, pickup.lng, destination.lat, destination.lng) : 0;
  const etaSeconds = distance * 60 * 2;
  const duration = Math.round(distance * 2 + 3);

  useEffect(() => {
    if (!token) return;
    const s = connectSocket(token);

    const onAccepted = (data: any) => {
      const store = useRideStore.getState();
      if (data.driverInfo) {
        const driverData = {
          _id: data.driverId,
          car: data.driverInfo.car,
          rating: data.driverInfo.rating,
          user: {
            firstName: data.driverInfo.firstName,
            lastName: data.driverInfo.lastName,
            photoUrl: data.driverInfo.photoUrl,
          },
        };
        store.setCurrentOrder({ ...store.currentOrder, driverId: driverData } as any);
      }
      setStep('found');
      setIsSearching(false);
    };

    const onArrived = (_data: any) => {
      toast(t('driver_arrived'));
      setStep('riding');
    };

    const onStarted = (_data: any) => {
      toast(t('ride_started'));
    };

    const onCompleted = (_data: any) => {
      toast.success(t('ride_completed'));
      setStep('completed');
      setIsSearching(false);
      setTimeout(() => { navigate('/'); }, 3000);
    };

    const onCancelled = (data: any) => {
      toast.error(data.reason || t('ride_cancelled'));
      setStep('price');
      setIsSearching(false);
    };

    const onSearchStatus = (data: any) => {
      if (data.status === 'timeout') {
        toast.error(t('no_drivers_found'));
        setIsSearching(false);
        setStep('price');
      }
    };

    s.on('ride:accepted', onAccepted);
    s.on('ride:arrived', onArrived);
    s.on('ride:in_progress', onStarted);
    s.on('ride:completed', onCompleted);
    s.on('ride:cancelled', onCancelled);
    s.on('search:status', onSearchStatus);

    const unsubLoc = subscribeToDriverLocation((data: any) => { setDriverLocation({ lat: data.lat, lng: data.lng }); });

    return () => {
      s.off('ride:accepted', onAccepted);
      s.off('ride:arrived', onArrived);
      s.off('ride:in_progress', onStarted);
      s.off('ride:completed', onCompleted);
      s.off('ride:cancelled', onCancelled);
      s.off('search:status', onSearchStatus);
      unsubLoc();
    };
  }, [token]);

  const handleOrderRide = async () => {
    if (!pickup || !destination || !priceEstimate) return;
    if (!pickupInside) { toast.error(t('taxi_only_tortkol')); return; }
    if (!destInside) { toast.error(t('taxi_only_tortkol')); return; }
    const distance = calcDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const duration = Math.round(distance * 2 + 3);
    try {
      const { data } = await ridesApi.createOrder({
        pickupLat: pickup.lat, pickupLng: pickup.lng, pickupAddress: pickup.address,
        destLat: destination.lat, destLng: destination.lng, destAddress: destination.address,
        distance, duration, paymentMethod, offeredPrice,
      });
      setCurrentOrder(data.order);
      setStep('searching');
      setIsSearching(true);
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('failed_create_order'));
    }
  };

  const selectedMethod = (method: string) =>
    paymentMethod === method ? 'bg-primary-500 text-white shadow-sm' : 'bg-white/5 text-gray-400 hover:bg-white/10';

  const paymentMethods = [
    { value: 'cash', label: '💵 Naqd', desc: t('cash_desc') },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0a0a1a]">
      {/* Map */}
      <div className="relative flex-1">
        <MapView
          center={mapCenter}
          zoom={districtConfig.zoom}
          pickup={pickup}
          destination={destination}
          driverLocation={step === 'found' ? driverLocation : null}
          route={route}
          showDistrict
          showSatelliteToggle
          showETA
          etaSeconds={etaSeconds}
          distanceKm={distance}
        />

        {/* Back Button */}
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-[1000]">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white hover:bg-white/10 active:scale-95 transition-all shadow-lg"
          >
            ←
          </button>
        </div>

        {/* Status Badges */}
        <div className="absolute top-3 right-16 sm:top-4 sm:right-16 z-[1000] flex gap-1.5">
          {pickup && (
            <span className={`px-2 py-1 rounded-badge text-[10px] font-semibold ${pickupInside ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'}`}>
              {pickupInside ? t('inside') : t('outside')}
            </span>
          )}
          {destination && (
            <span className={`px-2 py-1 rounded-badge text-[10px] font-semibold ${destInside ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'}`}>
              {destInside ? t('inside') : t('outside')}
            </span>
          )}
        </div>
      </div>

      {/* Bottom Sheet */}
      <AnimatePresence mode="wait">
        {step === 'price' && priceEstimate && (
          <motion.div
            key="price"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="glass border-t border-white/5 rounded-t-sheet px-4 sm:px-5 pt-5 pb-6 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-hide"
          >
            {/* Price Header */}
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">{t('price_breakdown')}</h2>
              <span className="text-xl sm:text-2xl font-bold text-primary-400">
                {priceEstimate.total.toLocaleString()} {t('sum')}
              </span>
            </div>

            {/* Price Details */}
            <div className="space-y-2 text-sm">
              {[
                { label: t('base_fare'), value: priceEstimate.baseFare },
                { label: t('distance'), value: priceEstimate.distanceFare },
                { label: t('time'), value: priceEstimate.timeFare },
              ].map((item, i) => (
                <div key={i} className="flex justify-between text-gray-400">
                  <span>{item.label}</span>
                  <span>{item.value.toLocaleString()} {t('sum')}</span>
                </div>
              ))}
              {priceEstimate.nightSurcharge > 0 && (
                <div className="flex justify-between text-yellow-400">
                  <span>{t('night_surcharge')}</span>
                  <span>+{priceEstimate.nightSurcharge.toLocaleString()} {t('sum')}</span>
                </div>
              )}
              {priceEstimate.rushSurcharge > 0 && (
                <div className="flex justify-between text-orange-400">
                  <span>{t('rush_surcharge')}</span>
                  <span>+{priceEstimate.rushSurcharge.toLocaleString()} {t('sum')}</span>
                </div>
              )}
            </div>

            {/* Offer Price */}
            <div>
              <label className="text-xs text-gray-400 mb-1.5 block">{t('offer_price')}</label>
              <input
                type="number"
                value={offeredPrice}
                onChange={(e) => setOfferedPrice(Number(e.target.value))}
                className="w-full bg-white/5 border border-white/10 rounded-input p-3 text-white text-sm outline-none focus:ring-2 focus:ring-primary-500/50 transition-all"
              />
            </div>

            {/* Payment Method */}
            <div>
              <label className="text-xs text-gray-400 mb-2 block">{t('payment_method')}</label>
              <div className="flex items-center gap-2 p-3 rounded-input bg-primary-500/10 border border-primary-500/30">
                <span className="text-lg">💵</span>
                <div>
                  <span className="text-sm font-medium text-primary-400">{t('cash')}</span>
                  <p className="text-[10px] text-gray-500">{t('cash_desc')}</p>
                </div>
              </div>
            </div>

            {/* Order Button */}
            <button
              onClick={handleOrderRide}
              className="w-full py-4 rounded-card bg-primary-500 text-white font-semibold text-base shadow-btn hover:bg-primary-600 active:scale-[0.98] transition-all"
            >
              {t('order_taxi_price', { price: offeredPrice.toLocaleString() })}
            </button>
          </motion.div>
        )}

        {step === 'searching' && (
          <motion.div
            key="searching"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="glass border-t border-white/5 rounded-t-sheet p-6 sm:p-8 text-center space-y-5"
          >
            <div className="flex justify-center">
              <div className="relative">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-4 border-primary-500/30 border-t-primary-500 animate-spin-slow" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-primary-500 searching-ripple" />
                </div>
              </div>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold">{t('searching_drivers')}</h2>
              <p className="text-gray-400 text-sm mt-1">{t('looking_for_drivers')}</p>
            </div>
            <div className="flex justify-center gap-2">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.2 }}
                  className="w-2 h-2 rounded-full bg-primary-500"
                />
              ))}
            </div>
            <button
              onClick={async () => {
                if (currentOrder?._id) {
                  try { await ridesApi.cancelOrder(currentOrder._id); } catch {}
                }
                setStep('price');
                setIsSearching(false);
                setCurrentOrder(null);
              }}
              className="text-red-400 text-sm font-medium active:scale-95 transition-all py-2"
            >
              {t('cancel_search')}
            </button>
          </motion.div>
        )}

        {step === 'found' && currentOrder && (
          <motion.div
            key="found"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="glass border-t border-white/5 rounded-t-sheet p-4 sm:p-5 space-y-4"
          >
            {/* Driver Info */}
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-primary-500/20 border-2 border-primary-500 flex items-center justify-center text-2xl flex-shrink-0">
                🚗
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base">{t('driver_on_way')}</h3>
                <p className="text-xs sm:text-sm text-gray-400 truncate">
                  {currentOrder.driverId?.car?.brand} {currentOrder.driverId?.car?.model} • {currentOrder.driverId?.car?.color}
                </p>
              </div>
            </div>

            {/* Driver Moving */}
            {driverLocation && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
                {t('driver_moving')}
              </div>
            )}

            {/* Action Buttons */}
            <div className="grid grid-cols-3 gap-2">
              <button className="py-3 rounded-btn bg-green-500/15 text-green-400 text-sm font-medium hover:bg-green-500/25 active:scale-[0.97] transition-all">
                {t('call')}
              </button>
              <button className="py-3 rounded-btn bg-primary-500/15 text-primary-400 text-sm font-medium hover:bg-primary-500/25 active:scale-[0.97] transition-all">
                {t('chat')}
              </button>
              <button className="py-3 rounded-btn bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 active:scale-[0.97] transition-all">
                {t('sos')}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'riding' && currentOrder && (
          <motion.div
            key="riding"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="glass border-t border-white/5 rounded-t-sheet p-4 sm:p-5 space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-blue-500/20 border-2 border-blue-500 flex items-center justify-center text-2xl flex-shrink-0 animate-pulse">
                🚗
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm sm:text-base">{t('ride_started')}</h3>
                <p className="text-xs sm:text-sm text-gray-400 truncate">
                  {currentOrder.driverId?.car?.brand} {currentOrder.driverId?.car?.model} • {currentOrder.driverId?.car?.plateNumber}
                </p>
              </div>
            </div>

            {driverLocation && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse flex-shrink-0" />
                {t('driver_moving')}
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <button className="py-3 rounded-btn bg-green-500/15 text-green-400 text-sm font-medium hover:bg-green-500/25 active:scale-[0.97] transition-all">
                {t('call')}
              </button>
              <button className="py-3 rounded-btn bg-primary-500/15 text-primary-400 text-sm font-medium hover:bg-primary-500/25 active:scale-[0.97] transition-all">
                {t('chat')}
              </button>
              <button className="py-3 rounded-btn bg-red-500/15 text-red-400 text-sm font-medium hover:bg-red-500/25 active:scale-[0.97] transition-all">
                {t('sos')}
              </button>
            </div>
          </motion.div>
        )}

        {step === 'completed' && (
          <motion.div
            key="completed"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="glass border-t border-white/5 rounded-t-sheet p-6 sm:p-8 text-center space-y-5"
          >
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="text-3xl">✅</span>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-semibold text-green-400">{t('ride_completed')}</h2>
              <p className="text-gray-400 text-sm mt-1">{t('thank_you')}</p>
            </div>
            <button
              onClick={() => navigate('/')}
              className="w-full py-3 rounded-card bg-primary-500 text-white font-semibold text-sm shadow-btn hover:bg-primary-600 active:scale-[0.98] transition-all"
            >
              {t('nav_home')}
            </button>
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
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}
