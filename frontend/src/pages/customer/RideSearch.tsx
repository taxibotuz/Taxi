import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useRideStore } from '../../store/rideStore';
import { ridesApi } from '../../services/api';
import { connectSocket, subscribeToRideUpdates, subscribeToDriverLocation } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import MapView from '../../components/ui/MapView';
import { isInsideDistrict, getDefaultCenter, districtConfig, getBoundary } from '../../services/geo';
import { useTranslation } from '../../i18n';

export default function RideSearch() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pickup, destination, currentOrder, setCurrentOrder, setIsSearching, isSearching, priceEstimate, setPriceEstimate } = useRideStore();
  const token = useAuthStore((s) => s.token);
  const [step, setStep] = useState<'price' | 'searching' | 'found' | 'completed'>('price');
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [offeredPrice, setOfferedPrice] = useState<number>(0);
  const [mapCenter, setMapCenter] = useState<[number, number]>([getDefaultCenter().lat, getDefaultCenter().lng]);

  const pickupInside = pickup ? isInsideDistrict(pickup) : false;
  const destInside = destination ? isInsideDistrict(destination) : false;

  useEffect(() => {
    if (!pickup || !destination) {
      navigate('/');
      return;
    }

    const distance = calcDistance(pickup.lat, pickup.lng, destination.lat, destination.lng);
    const duration = Math.round(distance * 2 + 3);

    ridesApi.estimatePrice({ distance, duration }).then(({ data }) => {
      setPriceEstimate(data.price);
      setOfferedPrice(data.price.total);
    });
  }, []);

  useEffect(() => {
    if (pickup) {
      setMapCenter([pickup.lat, pickup.lng]);
    } else if (destination) {
      setMapCenter([destination.lat, destination.lng]);
    }
  }, [pickup, destination]);

  const route = pickup && destination ? [pickup, destination] : [];
  const distance = pickup && destination ? calcDistance(pickup.lat, pickup.lng, destination.lat, destination.lng) : 0;
  const etaSeconds = distance * 60 * 2;
  const duration = Math.round(distance * 2 + 3);

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);

    const unsubRide = subscribeToRideUpdates((data) => {
      if (data.status === 'found' || data.rideId) {
        setStep('found');
        setIsSearching(false);
      }
      if (data.status === 'timeout') {
        toast.error(t('no_drivers_found'));
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

    if (!pickupInside) {
      toast.error(t('taxi_only_tortkol'));
      return;
    }

    if (!destInside) {
      toast.error(t('taxi_only_tortkol'));
      return;
    }

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
      toast.error(error.response?.data?.error || t('failed_create_order'));
    }
  };

  const selectedMethod = (method: string) => paymentMethod === method ? 'bg-primary-500 text-white' : 'bg-white/10 text-white';

  const paymentMethods = [
    { value: 'cash', label: t('cash'), desc: t('cash_desc') },
    { value: 'click', label: t('click'), desc: t('click_desc') },
    { value: 'payme', label: t('payme'), desc: t('payme_desc') },
    { value: 'uzum', label: t('uzum'), desc: t('uzum_desc') },
    { value: 'card', label: t('card'), desc: t('card_desc') },
    { value: 'wallet', label: t('wallet'), desc: t('wallet_desc') },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0a0a1a]">
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

        <div className="absolute top-4 left-4 z-10 flex gap-2">
          <button
            onClick={() => navigate('/')}
            className="w-10 h-10 glass rounded-xl flex items-center justify-center text-white"
          >
            ←
          </button>
        </div>

        <div className="absolute top-4 right-16 z-10 flex gap-2">
          {pickup && (
            <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${pickupInside ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'}`}>
              {pickupInside ? t('inside') : t('outside')}
            </span>
          )}
          {destination && (
            <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${destInside ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'}`}>
              {destInside ? t('inside') : t('outside')}
            </span>
          )}
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
              <h2 className="text-lg font-semibold">{t('price_breakdown')}</h2>
              <span className="text-2xl font-bold text-primary-500">
                {priceEstimate.total.toLocaleString()} {t('sum')}
              </span>
            </div>

            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex justify-between">
                <span>{t('base_fare')}</span>
                <span>{priceEstimate.baseFare.toLocaleString()} {t('sum')}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('distance')}</span>
                <span>{priceEstimate.distanceFare.toLocaleString()} {t('sum')}</span>
              </div>
              <div className="flex justify-between">
                <span>{t('time')}</span>
                <span>{priceEstimate.timeFare.toLocaleString()} {t('sum')}</span>
              </div>
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

            <div>
              <label className="text-sm text-gray-400 mb-2 block">
                {t('offer_price')}
              </label>
              <input
                type="number"
                value={offeredPrice}
                onChange={(e) => setOfferedPrice(Number(e.target.value))}
                className="w-full bg-white/10 rounded-xl p-3 text-white outline-none"
              />
            </div>

            <div>
              <label className="text-sm text-gray-400 mb-2 block">{t('payment_method')}</label>
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
            <h2 className="text-xl font-semibold">{t('searching_drivers')}</h2>
            <p className="text-gray-400 text-sm">{t('looking_for_drivers')}</p>
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
            className="glass rounded-t-3xl p-5 space-y-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-primary-500 flex items-center justify-center text-2xl">
                🚗
              </div>
              <div>
                <h3 className="font-semibold">{t('driver_on_way')}</h3>
                <p className="text-sm text-gray-400">
                  {currentOrder.driverId?.car?.brand} {currentOrder.driverId?.car?.model} • {currentOrder.driverId?.car?.color}
                </p>
              </div>
            </div>

            {driverLocation && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {t('driver_moving')}
              </div>
            )}

            <div className="flex gap-3">
              <button className="flex-1 py-3 rounded-xl bg-green-500/20 text-green-400 text-sm font-medium">
                {t('call')}
              </button>
              <button className="flex-1 py-3 rounded-xl bg-primary-500/20 text-primary-400 text-sm font-medium">
                {t('chat')}
              </button>
              <button className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 text-sm font-medium">
                {t('sos')}
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
