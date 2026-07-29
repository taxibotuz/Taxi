import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { emitRideAccept, emitRideReject } from '../../services/socket';
import { useTranslation } from '../../i18n';

interface RideRequestData {
  rideId: string;
  pickup: { address: string; coordinates: [number, number] };
  destination: { address: string; coordinates: [number, number] };
  distance: number;
  duration: number;
  price: number;
  driverDistance: number;
  driverEta: number;
  pickupLat: number;
  pickupLng: number;
  destLat: number;
  destLng: number;
}

interface Props {
  request: RideRequestData;
  onExpired: () => void;
  onAccepted: () => void;
}

export default function DriverRideRequest({ request, onExpired, onAccepted }: Props) {
  const { t } = useTranslation();
  const [countdown, setCountdown] = useState(30);
  const [actionTaken, setActionTaken] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          if (!actionTaken) {
            emitRideReject(request.rideId, 'timeout');
            onExpired();
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [request.rideId]);

  const handleAccept = () => {
    if (actionTaken) return;
    setActionTaken(true);
    if (timerRef.current) clearInterval(timerRef.current);
    emitRideAccept(request.rideId);
    onAccepted();
  };

  const handleReject = () => {
    if (actionTaken) return;
    setActionTaken(true);
    if (timerRef.current) clearInterval(timerRef.current);
    emitRideReject(request.rideId, 'rejected');
    onExpired();
  };

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timerColor = countdown <= 10 ? 'text-red-500' : countdown <= 20 ? 'text-yellow-500' : 'text-green-500';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9, y: 20 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9, y: -20 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/60"
    >
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        exit={{ y: 100 }}
        className="glass rounded-t-2xl sm:rounded-2xl p-5 w-full max-w-md space-y-4 border border-primary-500/30 shadow-2xl"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <h2 className="text-lg font-bold text-green-400">{t('new_ride_request')}</h2>
          </div>
          <div className={`text-2xl font-bold font-mono ${timerColor}`}>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
        </div>

        <div className="space-y-3">
          <div className="bg-white/5 rounded-xl p-3 space-y-2">
            <div className="flex items-start gap-2">
              <span className="text-green-500 mt-0.5">🟢</span>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500">{t('pickup_label')}</p>
                <p className="text-sm font-medium truncate">{request.pickup.address}</p>
              </div>
            </div>
            <div className="border-l-2 border-dashed border-white/10 h-4 ml-[17px]" />
            <div className="flex items-start gap-2">
              <span className="text-red-500 mt-0.5">🔴</span>
              <div className="min-w-0">
                <p className="text-[10px] text-gray-500">{t('destination_label')}</p>
                <p className="text-sm font-medium truncate">{request.destination.address}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-white/5 rounded-xl p-2">
              <p className="text-lg font-bold">{request.distance.toFixed(1)}</p>
              <p className="text-[10px] text-gray-500">{t('distance_label')}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-2">
              <p className="text-lg font-bold">{request.driverEta.toFixed(0)}</p>
              <p className="text-[10px] text-gray-500">{t('eta_label')}</p>
            </div>
            <div className="bg-white/5 rounded-xl p-2">
              <p className="text-lg font-bold text-primary-400">{request.price.toLocaleString()}</p>
              <p className="text-[10px] text-gray-500">{t('sum')}</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleReject}
            disabled={actionTaken}
            className="flex-1 py-3 rounded-xl bg-red-500/15 text-red-400 font-semibold text-sm hover:bg-red-500/25 active:scale-[0.97] transition-all disabled:opacity-40"
          >
            {t('reject')}
          </button>
          <button
            onClick={handleAccept}
            disabled={actionTaken}
            className="flex-1 py-3 rounded-xl bg-green-500/15 text-green-400 font-semibold text-sm hover:bg-green-500/25 active:scale-[0.97] transition-all disabled:opacity-40"
          >
            {t('accept')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
