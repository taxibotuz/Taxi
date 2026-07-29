import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MapView from '../../components/ui/MapView';
import { useRideStore } from '../../store/rideStore';
import { useAuthStore } from '../../store/authStore';
import { isInsideDistrict, getDefaultCenter } from '../../services/geo';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n';

interface SearchResult {
  lat: number;
  lng: number;
  displayName: string;
  type: string;
  street?: string;
}

export default function CustomerHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { pickup, destination, setPickup, setDestination } = useRideStore();
  const token = useAuthStore((s) => s.token);
  const [showPickupSearch, setShowPickupSearch] = useState(false);
  const [showDestSearch, setShowDestSearch] = useState(false);
  const [pickupText, setPickupText] = useState('');
  const [destText, setDestText] = useState('');
  const [userLocation, setUserLocation] = useState<[number, number]>([getDefaultCenter().lat, getDefaultCenter().lng]);
  const [pickupResults, setPickupResults] = useState<SearchResult[]>([]);
  const [destResults, setDestResults] = useState<SearchResult[]>([]);
  const [showPickupResults, setShowPickupResults] = useState(false);
  const [showDestResults, setShowDestResults] = useState(false);
  const pickupTimeout = useRef<ReturnType<typeof setTimeout>>();
  const destTimeout = useRef<ReturnType<typeof setTimeout>>();
  const pickupRef = useRef<HTMLDivElement>(null);
  const destRef = useRef<HTMLDivElement>(null);

  const pickupInside = pickup ? isInsideDistrict(pickup) : null;
  const destInside = destination ? isInsideDistrict(destination) : null;

  const apiUrl = import.meta.env.VITE_API_URL || '';

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
          setUserLocation(loc);
          const point = { lat: loc[0], lng: loc[1] };
          if (isInsideDistrict(point)) {
            fetchAddressName(loc[0], loc[1]).then((name) => {
              setPickup({ lat: loc[0], lng: loc[1], address: name || 'Current Location' });
              setPickupText(name || 'Current Location');
            });
          } else {
            toast.error(t('taxi_only_tortkol'));
            setPickup({ lat: getDefaultCenter().lat, lng: getDefaultCenter().lng, address: "To'rtko'l tumani markazi" });
            setPickupText("To'rtko'l tumani markazi");
          }
        },
        () => {
          setPickup({ lat: getDefaultCenter().lat, lng: getDefaultCenter().lng, address: "To'rtko'l tumani markazi" });
          setPickupText("To'rtko'l tumani markazi");
        }
      );
    } else {
      setPickup({ lat: getDefaultCenter().lat, lng: getDefaultCenter().lng, address: "To'rtko'l tumani markazi" });
      setPickupText("To'rtko'l tumani markazi");
    }
  }, []);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (pickupRef.current && !pickupRef.current.contains(e.target as Node)) {
        setShowPickupResults(false);
      }
      if (destRef.current && !destRef.current.contains(e.target as Node)) {
        setShowDestResults(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function fetchAddressName(lat: number, lng: number): Promise<string | null> {
    try {
      const res = await fetch(`${apiUrl}/api/search/reverse?lat=${lat}&lng=${lng}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return null;
      const data = await res.json();
      if (data.result) {
        const parts = [data.result.street, data.result.district, data.result.city].filter(Boolean);
        return parts.join(', ') || data.result.displayName;
      }
      return null;
    } catch {
      return null;
    }
  }

  async function searchAddresses(query: string): Promise<SearchResult[]> {
    if (query.length < 2) return [];
    try {
      const res = await fetch(`${apiUrl}/api/search/autocomplete?q=${encodeURIComponent(query)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.results || [];
    } catch {
      return [];
    }
  }

  const handlePickupInput = (value: string) => {
    setPickupText(value);
    setShowPickupSearch(true);
    if (pickupTimeout.current) clearTimeout(pickupTimeout.current);
    pickupTimeout.current = setTimeout(async () => {
      if (value.length >= 2) {
        const results = await searchAddresses(value);
        setPickupResults(results);
        setShowPickupResults(true);
      } else {
        setPickupResults([]);
        setShowPickupResults(false);
      }
    }, 300);
  };

  const handleDestInput = (value: string) => {
    setDestText(value);
    setShowDestSearch(true);
    if (destTimeout.current) clearTimeout(destTimeout.current);
    destTimeout.current = setTimeout(async () => {
      if (value.length >= 2) {
        const results = await searchAddresses(value);
        setDestResults(results);
        setShowDestResults(true);
      } else {
        setDestResults([]);
        setShowDestResults(false);
      }
    }, 300);
  };

  const selectPickup = (result: SearchResult) => {
    setPickup({ lat: result.lat, lng: result.lng, address: result.displayName });
    setPickupText(result.displayName);
    setShowPickupSearch(false);
    setShowPickupResults(false);
  };

  const selectDest = (result: SearchResult) => {
    setDestination({ lat: result.lat, lng: result.lng, address: result.displayName });
    setDestText(result.displayName);
    setShowDestSearch(false);
    setShowDestResults(false);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    const point = { lat, lng };
    const name = await fetchAddressName(lat, lng);
    const display = name || `📍 ${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    if (showPickupSearch) {
      setPickup({ lat, lng, address: display });
      setPickupText(display);
      setShowPickupSearch(false);
    } else if (showDestSearch || !destination) {
      setDestination({ lat, lng, address: display });
      setDestText(display);
      setShowDestSearch(false);
    }
  };

  const handleOrderRide = () => {
    if (!pickup || !destination) return;
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
          showSatelliteToggle
        />
      </div>

      <div className="absolute top-0 left-0 right-0 z-10 p-3 sm:p-4 pt-[var(--safe-area-top)]">
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="glass rounded-card p-3 sm:p-4 space-y-2.5"
        >
          <div ref={pickupRef} className="relative">
            <div
              onClick={() => { setShowPickupSearch(true); setShowDestSearch(false); }}
              className="flex items-center gap-3 bg-white/5 hover:bg-white/[0.08] active:bg-white/[0.12] rounded-input p-3 cursor-pointer transition-all"
            >
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${pickupInside === null ? 'bg-green-500' : pickupInside ? 'bg-green-500' : 'bg-red-500'}`} />
              <input
                type="text"
                placeholder={t('pickup_location')}
                value={pickupText}
                onChange={(e) => handlePickupInput(e.target.value)}
                onFocus={() => { setShowPickupSearch(true); setShowDestSearch(false); }}
                className="bg-transparent text-white text-sm flex-1 outline-none placeholder-gray-500 min-w-0"
              />
              {pickupInside !== null && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-badge flex-shrink-0 ${pickupInside ? 'text-green-400 bg-green-500/15' : 'text-red-400 bg-red-500/15'}`}>
                  {pickupInside ? t('inside') : t('outside')}
                </span>
              )}
            </div>
            {showPickupResults && pickupResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 glass rounded-card max-h-48 overflow-y-auto z-20 shadow-xl">
                {pickupResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => selectPickup(r)}
                    className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 border-b border-white/5 last:border-0 transition-colors"
                  >
                    <span className="block truncate">{r.displayName}</span>
                    <span className="text-[10px] text-gray-500">{r.type}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-l-2 border-dashed border-white/10 h-2 ml-[21px]" />

          <div ref={destRef} className="relative">
            <div
              onClick={() => { setShowDestSearch(true); setShowPickupSearch(false); }}
              className="flex items-center gap-3 bg-white/5 hover:bg-white/[0.08] active:bg-white/[0.12] rounded-input p-3 cursor-pointer transition-all"
            >
              <div className={`w-3 h-3 rounded-full flex-shrink-0 ${destInside === null ? 'bg-red-500' : destInside ? 'bg-green-500' : 'bg-red-500'}`} />
              <input
                type="text"
                placeholder={t('where_to')}
                value={destText}
                onChange={(e) => handleDestInput(e.target.value)}
                onFocus={() => { setShowDestSearch(true); setShowPickupSearch(false); }}
                className="bg-transparent text-white text-sm flex-1 outline-none placeholder-gray-500 min-w-0"
              />
              {destInside !== null && (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-badge flex-shrink-0 ${destInside ? 'text-green-400 bg-green-500/15' : 'text-red-400 bg-red-500/15'}`}>
                  {destInside ? t('inside') : t('outside')}
                </span>
              )}
            </div>
            {showDestResults && destResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 glass rounded-card max-h-48 overflow-y-auto z-20 shadow-xl">
                {destResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => selectDest(r)}
                    className="w-full text-left px-3 py-2.5 text-sm text-white hover:bg-white/10 border-b border-white/5 last:border-0 transition-colors"
                  >
                    <span className="block truncate">{r.displayName}</span>
                    <span className="text-[10px] text-gray-500">{r.type}</span>
                  </button>
                ))}
              </div>
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
