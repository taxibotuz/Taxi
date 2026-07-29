import { useState } from 'react';
import { motion } from 'framer-motion';
import { ridesApi } from '../../services/api';
import MapView from '../ui/MapView';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n';

interface ActiveRideData {
  _id: string;
  orderNumber: string;
  status: string;
  pickup: { address: string; coordinates: [number, number] };
  destination: { address: string; coordinates: [number, number] };
  distance: number;
  duration: number;
  pricing: { total: number };
  customerId?: { _id: string; firstName: string; lastName?: string; phone?: string; photoUrl?: string };
}

interface Props {
  order: ActiveRideData;
  onStatusChanged: () => void;
}

export default function DriverRideActive({ order, onStatusChanged }: Props) {
  const { t } = useTranslation();
  const [updating, setUpdating] = useState(false);

  const pickupCoords: [number, number] = order.pickup.coordinates
    ? [order.pickup.coordinates[1], order.pickup.coordinates[0]]
    : [41.55, 61.0];
  const destCoords: [number, number] = order.destination.coordinates
    ? [order.destination.coordinates[1], order.destination.coordinates[0]]
    : [41.55, 61.0];

  const customerName = order.customerId
    ? `${order.customerId.firstName}${order.customerId.lastName ? ' ' + order.customerId.lastName : ''}`
    : t('customer');

  const handleStatusUpdate = async (status: string) => {
    if (updating) return;
    setUpdating(true);
    try {
      await ridesApi.updateStatus(order._id, status);
      toast.success(t(`ride_${status}`));
      onStatusChanged();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('failed_update_status'));
    } finally {
      setUpdating(false);
    }
  };

  const getActionButtons = () => {
    switch (order.status) {
      case 'accepted':
        return (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleStatusUpdate('cancelled')}
              disabled={updating}
              className="py-3 rounded-xl bg-red-500/15 text-red-400 font-semibold text-sm hover:bg-red-500/25 active:scale-[0.97] transition-all disabled:opacity-40"
            >
              {t('cancel_ride')}
            </button>
            <button
              onClick={() => handleStatusUpdate('arrived')}
              disabled={updating}
              className="py-3 rounded-xl bg-green-500/15 text-green-400 font-semibold text-sm hover:bg-green-500/25 active:scale-[0.97] transition-all disabled:opacity-40"
            >
              {t('arrived')}
            </button>
          </div>
        );
      case 'arrived':
        return (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleStatusUpdate('cancelled')}
              disabled={updating}
              className="py-3 rounded-xl bg-red-500/15 text-red-400 font-semibold text-sm hover:bg-red-500/25 active:scale-[0.97] transition-all disabled:opacity-40"
            >
              {t('cancel_ride')}
            </button>
            <button
              onClick={() => handleStatusUpdate('in_progress')}
              disabled={updating}
              className="py-3 rounded-xl bg-primary-500/15 text-primary-400 font-semibold text-sm hover:bg-primary-500/25 active:scale-[0.97] transition-all disabled:opacity-40"
            >
              {t('start_ride')}
            </button>
          </div>
        );
      case 'in_progress':
        return (
          <button
            onClick={() => handleStatusUpdate('completed')}
            disabled={updating}
            className="w-full py-3 rounded-xl bg-green-500/15 text-green-400 font-semibold text-sm hover:bg-green-500/25 active:scale-[0.97] transition-all disabled:opacity-40"
          >
            {t('complete_ride')}
          </button>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Map */}
      <div className="h-40 sm:h-48 rounded-card overflow-hidden">
        <MapView
          center={pickupCoords}
          pickup={{ lat: pickupCoords[0], lng: pickupCoords[1] }}
          destination={{ lat: destCoords[0], lng: destCoords[1] }}
          route={[{ lat: pickupCoords[0], lng: pickupCoords[1] }, { lat: destCoords[0], lng: destCoords[1] }]}
          showSatelliteToggle={false}
          showDistrict={false}
        />
      </div>

      {/* Ride Info */}
      <div className="glass rounded-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <h3 className="font-semibold text-sm">{t('active_ride')}</h3>
          </div>
          <span className="text-xs font-mono text-gray-500">#{order.orderNumber}</span>
        </div>

        {/* Customer Info */}
        {order.customerId && (
          <div className="flex items-center gap-3 bg-white/5 rounded-xl p-3">
            <div className="w-10 h-10 rounded-full bg-primary-500/20 flex items-center justify-center text-lg flex-shrink-0">
              {order.customerId.photoUrl ? (
                <img src={order.customerId.photoUrl} className="w-10 h-10 rounded-full" alt="" />
              ) : (
                '👤'
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{customerName}</p>
              {order.customerId.phone && (
                <p className="text-xs text-gray-400">{order.customerId.phone}</p>
              )}
            </div>
            {order.customerId.phone && (
              <a
                href={`tel:${order.customerId.phone}`}
                className="ml-auto w-9 h-9 rounded-full bg-green-500/15 flex items-center justify-center text-green-400 flex-shrink-0 hover:bg-green-500/25"
              >
                📞
              </a>
            )}
          </div>
        )}

        {/* Trip Info */}
        <div className="bg-white/5 rounded-xl p-3 space-y-2">
          <div className="flex items-start gap-2">
            <span className="text-green-500 mt-0.5">🟢</span>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500">{t('pickup_label')}</p>
              <p className="text-sm font-medium truncate">{order.pickup.address}</p>
            </div>
          </div>
          <div className="border-l-2 border-dashed border-white/10 h-4 ml-[17px]" />
          <div className="flex items-start gap-2">
            <span className="text-red-500 mt-0.5">🔴</span>
            <div className="min-w-0">
              <p className="text-[10px] text-gray-500">{t('destination_label')}</p>
              <p className="text-sm font-medium truncate">{order.destination.address}</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-white/5 rounded-xl p-2">
            <p className="text-base font-bold">{order.distance?.toFixed(1)}</p>
            <p className="text-[10px] text-gray-500">{t('distance_label')}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2">
            <p className="text-base font-bold">{order.duration}</p>
            <p className="text-[10px] text-gray-500">{t('duration')}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-2">
            <p className="text-base font-bold text-primary-400">{order.pricing?.total?.toLocaleString()}</p>
            <p className="text-[10px] text-gray-500">{t('sum')}</p>
          </div>
        </div>

        {/* Action Buttons */}
        {getActionButtons()}

        {/* Status badge */}
        <div className="text-center">
          <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-primary-500/10 text-primary-400 border border-primary-500/20">
            {t(`status_${order.status}`)}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
