import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MapView from '../../components/ui/MapView';
import { useRideStore } from '../../store/rideStore';
import { isInsideDistrict, getDefaultCenter } from '../../services/geo';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n';

export default function CustomerHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pickup, destination, setPickup, setDestination } = useRideStore();
  const [showPickupSearch, setShowPickupSearch] = useState(false);
  const [showDestSearch, setShowDestSearch] = useState(false);
  const [pickupText, setPickupText] = useState('');
  const [destText, setDestText] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number]>([getDefaultCenter().lat, getDefaultCenter().lng]);

  const pickupInside = pickup ? isInsideDistrict(pickup) : null;
  const destInside = destination ? isInsideDistrict(destination) : null;

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          const point = { lat: loc[0], lng: loc[1] };
          if (isInsideDistrict(point)) {
            setPickup({ lat: loc[0], lng: loc[1], address: 'Current Location' });
          } else {
            toast.error(t('taxi_only_tortkol'));
            setPickup({ lat: getDefaultCenter().lat, lng: getDefaultCenter().lng, address: "To'rtko'l tumani markazi" });
          }
        },
        () => {
          setPickup({ lat: getDefaultCenter().lat, lng: getDefaultCenter().lng, address: "To'rtko'l tumani markazi" });
        }
      );
    } else {
      setPickup({ lat: getDefaultCenter().lat, lng: getDefaultCenter().lng, address: "To'rtko'l tumani markazi" });
    }
  }, []);

  const handleMapClick = (lat: number, lng: number) => {
    const point = { lat, lng };
    const inside = isInsideDistrict(point);
    if (showPickupSearch) {
      setPickup({ lat, lng, address: `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      setPickupText(`📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setShowPickupSearch(false);
      if (!inside) toast.error(t('pickup_outside_district'));
    } else if (showDestSearch || !destination) {
      setDestination({ lat, lng, address: `🏁 ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      setDestText(`🏁 ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setShowDestSearch(false);
      if (!inside) toast.error(t('dest_outside_district'));
    }
  };

  const handleOrderRide = () => {
    if (!pickup || !destination) return;
    if (!isInsideDistrict(pickup)) { toast.error(t('pickup_outside_service')); return; }
    if (!isInsideDistrict(destination)) { toast.error(t('dest_outside_service')); return; }
    navigate('/search');
  };

  const isReady = pickup && destination;

  return (
    <div className="relative h-full w-full">
      {/* Map */}
      <div className="absolute inset-0">
        <MapView
          center={userLocation}
          pickup={pickup}
          destination={destination}
          onClick={handleMapClick}
          showDistrict
          showSatelliteToggle
        />
      </div>

      {/* Search Card */}
      <div className="absolute top-0 left-0 right-0 z-10 p-3 sm:p-4 pt-[var(--safe-area-top)]">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass rounded-card p-3 sm:p-4 space-y-2.5"
        >
          {/* Pickup Input */}
          <div
            onClick={() => { setShowPickupSearch(true); setShowDestSearch(false); }}
            className="flex items-center gap-3 bg-white/5 hover:bg-white/[0.08] active:bg-white/[0.12] rounded-input p-3 cursor-pointer transition-all"
          >
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${pickupInside === null ? 'bg-green-500' : pickupInside ? 'bg-green-500' : 'bg-red-500'}`} />
            <input
              type="text"
              placeholder={t('pickup_location')}
              value={pickupText}
              onChange={(e) => setPickupText(e.target.value)}
              className="bg-transparent text-white text-sm flex-1 outline-none placeholder-gray-500 min-w-0"
              readOnly={!showPickupSearch}
            />
            {pickupInside !== null && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-badge flex-shrink-0 ${pickupInside ? 'text-green-400 bg-green-500/15' : 'text-red-400 bg-red-500/15'}`}>
                {pickupInside ? t('inside') : t('outside')}
              </span>
            )}
          </div>

          {/* Divider */}
          <div className="border-l-2 border-dashed border-white/10 h-2 ml-[21px]" />

          {/* Destination Input */}
          <div
            onClick={() => { setShowDestSearch(true); setShowPickupSearch(false); }}
            className="flex items-center gap-3 bg-white/5 hover:bg-white/[0.08] active:bg-white/[0.12] rounded-input p-3 cursor-pointer transition-all"
          >
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${destInside === null ? 'bg-red-500' : destInside ? 'bg-green-500' : 'bg-red-500'}`} />
            <input
              type="text"
              placeholder={t('where_to')}
              value={destText}
              onChange={(e) => setDestText(e.target.value)}
              className="bg-transparent text-white text-sm flex-1 outline-none placeholder-gray-500 min-w-0"
              readOnly={!showDestSearch}
            />
            {destInside !== null && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-badge flex-shrink-0 ${destInside ? 'text-green-400 bg-green-500/15' : 'text-red-400 bg-red-500/15'}`}>
                {destInside ? t('inside') : t('outside')}
              </span>
            )}
          </div>
        </motion.div>
      </div>

      {/* Order Button */}
      <AnimatePresence>
        {isReady && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-20 left-3 right-3 sm:left-4 sm:right-4 z-10"
          >
            <button
              onClick={handleOrderRide}
              className="w-full py-4 rounded-card bg-primary-500 text-white font-semibold text-lg shadow-btn hover:bg-primary-600 active:scale-[0.98] transition-all"
            >
              {t('order_taxi')}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
