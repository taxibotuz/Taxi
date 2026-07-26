import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MapView from '../../components/ui/MapView';
import { useRideStore } from '../../store/rideStore';
import { ridesApi } from '../../services/api';
import { isInsideDistrict, getDefaultCenter } from '../../services/geo';
import toast from 'react-hot-toast';

export default function CustomerHome() {
  const navigate = useNavigate();
  const { pickup, destination, setPickup, setDestination, setPriceEstimate, priceEstimate } = useRideStore();
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
            toast.error("TaxiGo hozircha faqat To'rtko'l tumani hududida ishlaydi.");
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
      if (!inside) toast.error("Pickup outside To'rtko'l district");
    } else if (showDestSearch || !destination) {
      setDestination({ lat, lng, address: `🏁 ${lat.toFixed(4)}, ${lng.toFixed(4)}` });
      setDestText(`🏁 ${lat.toFixed(4)}, ${lng.toFixed(4)}`);
      setShowDestSearch(false);
      if (!inside) toast.error("Destination outside To'rtko'l district");
    }
  };

  const handleOrderRide = () => {
    if (!pickup || !destination) return;
    if (!isInsideDistrict(pickup)) {
      toast.error("Pickup location is outside the service area");
      return;
    }
    if (!isInsideDistrict(destination)) {
      toast.error("Destination is outside the service area");
      return;
    }
    navigate('/search');
  };

  const isReady = pickup && destination;

  return (
    <div className="relative h-full w-full">
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

      <div className="absolute top-0 left-0 right-0 z-10 p-4 pt-[var(--safe-area-top)]">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass rounded-2xl p-4 space-y-3"
        >
          <div
            onClick={() => { setShowPickupSearch(true); setShowDestSearch(false); }}
            className="flex items-center gap-3 bg-white/5 rounded-xl p-3 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${pickupInside === null ? 'bg-green-500' : pickupInside ? 'bg-green-500' : 'bg-red-500'}`} />
            <input
              type="text"
              placeholder="Pickup location"
              value={pickupText}
              onChange={(e) => setPickupText(e.target.value)}
              className="bg-transparent text-white text-sm flex-1 outline-none placeholder-gray-400"
              readOnly={!showPickupSearch}
            />
            {pickupInside !== null && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${pickupInside ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'}`}>
                {pickupInside ? '✓ Inside' : '✗ Outside'}
              </span>
            )}
          </div>

          <div
            onClick={() => { setShowDestSearch(true); setShowPickupSearch(false); }}
            className="flex items-center gap-3 bg-white/5 rounded-xl p-3 cursor-pointer active:scale-[0.98] transition-transform"
          >
            <div className={`w-3 h-3 rounded-full flex-shrink-0 ${destInside === null ? 'bg-red-500' : destInside ? 'bg-green-500' : 'bg-red-500'}`} />
            <input
              type="text"
              placeholder="Where to?"
              value={destText}
              onChange={(e) => setDestText(e.target.value)}
              className="bg-transparent text-white text-sm flex-1 outline-none placeholder-gray-400"
              readOnly={!showDestSearch}
            />
            {destInside !== null && (
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${destInside ? 'text-green-400 bg-green-500/20' : 'text-red-400 bg-red-500/20'}`}>
                {destInside ? '✓ Inside' : '✗ Outside'}
              </span>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isReady && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-20 left-4 right-4 z-10"
          >
            <button
              onClick={handleOrderRide}
              className="w-full py-4 rounded-2xl bg-primary-500 text-white font-semibold text-lg shadow-lg shadow-primary-500/30 active:scale-[0.98] transition-transform"
            >
              Order Taxi
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
