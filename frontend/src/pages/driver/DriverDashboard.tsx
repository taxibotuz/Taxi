import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { driversApi } from '../../services/api';
import { isInsideDistrict } from '../../services/geo';
import { useLocationTracking } from '../../hooks/useLocationTracking';
import toast from 'react-hot-toast';
import { useTranslation } from '../../i18n';

export default function DriverDashboard() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['driver', 'dashboard'],
    queryFn: () => driversApi.getDashboard(),
    refetchInterval: 10000,
  });

  const toggleMutation = useMutation({
    mutationFn: () => driversApi.toggleOnline(),
    onSuccess: (data: any) => {
      toast.success(data.data.isOnline ? t('you_are_online') : t('you_are_offline'));
      queryClient.invalidateQueries({ queryKey: ['driver', 'dashboard'] });
    },
  });

  const driver = data?.data?.driver;
  const stats = data?.data?.stats;
  const activeRide = data?.data?.activeRide;

  const driverLocation = driver?.currentLocation?.coordinates
    ? { lat: driver.currentLocation.coordinates[1], lng: driver.currentLocation.coordinates[0] }
    : null;

  const isInDistrict = driverLocation ? isInsideDistrict(driverLocation) : true;

  const { isTracking, gpsAvailable } = useLocationTracking({
    enabled: !!driver?.isOnline,
    intervalMs: 7000,
    distanceThresholdMeters: 20,
  });

  const StatCard = ({ label, value, icon, className = '' }: { label: string; value: string | number; icon: string; className?: string }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`glass rounded-card p-3 sm:p-4 text-center ${className}`}
    >
      <div className="text-xl sm:text-2xl mb-1">{icon}</div>
      <div className="text-base sm:text-xl font-bold truncate">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </div>
      <div className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate">{label}</div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 rounded-card skeleton" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-8 space-y-4">
      {/* Header + Toggle */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-xl sm:text-2xl font-bold">{t('driver_panel')}</h1>
        {isInDistrict ? (
          <button
            onClick={() => toggleMutation.mutate()}
            disabled={toggleMutation.isPending}
            className={`px-5 py-2.5 rounded-btn font-semibold text-sm transition-all active:scale-[0.97] disabled:opacity-50 ${
              driver?.isOnline
                ? 'bg-green-500/15 text-green-400 border border-green-500/30 shadow-sm'
                : 'bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10'
            }`}
          >
            {driver?.isOnline ? t('online') : t('offline')}
          </button>
        ) : (
          <div className="px-4 py-2.5 rounded-btn bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-medium text-center">
            {t('tortkol_outside')}
          </div>
        )}
      </motion.div>

      {/* GPS Status */}
      {driver?.isOnline && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`rounded-card p-3 text-xs font-medium flex items-center gap-2 ${
            !gpsAvailable
              ? 'bg-red-500/10 border border-red-500/30 text-red-400'
              : isTracking
              ? 'bg-green-500/10 border border-green-500/30 text-green-400'
              : 'bg-yellow-500/10 border border-yellow-500/30 text-yellow-400'
          }`}
        >
          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${!gpsAvailable ? 'bg-red-500' : isTracking ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
          {!gpsAvailable
            ? t('gps_unavailable')
            : isTracking
            ? t('location_tracking_active')
            : t('location_starting')}
        </motion.div>
      )}

      {/* Subscription Status */}
      {driver?.subscription?.active && driver?.subscription?.expiresAt && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-card p-3 text-xs font-medium bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
          {t('subscription_active')} • {t('subscription_expires')}: {new Date(driver.subscription.expiresAt).toLocaleDateString()}
        </motion.div>
      )}
      {driver?.subscription && !driver?.subscription?.active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-card p-3 text-xs font-medium bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2"
        >
          <div className="w-2 h-2 rounded-full bg-red-500" />
          {t('subscription_expired_warning')}
        </motion.div>
      )}

      {/* Active Ride */}
      {activeRide && (
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-card p-4 border-l-4 border-green-500"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse flex-shrink-0" />
            <span className="font-semibold text-sm">{t('active_ride')}</span>
          </div>
          <p className="text-xs text-gray-400 mt-2 truncate">
            #{activeRide.orderNumber} • {activeRide.pickup.address}
          </p>
          <div className="flex items-center gap-1.5 mt-2 text-xs text-green-400">
            <span>💵</span>
            <span className="font-medium">To'lov: Naqd</span>
          </div>
        </motion.div>
      )}

      {/* Earnings Stats */}
      <div className="grid grid-cols-2 gap-2 sm:gap-3">
        <StatCard icon="💰" label={t('today')} value={`${stats?.todayEarnings?.toLocaleString() || 0}`} />
        <StatCard icon="📊" label={t('this_week')} value={`${stats?.weeklyEarnings?.toLocaleString() || 0}`} />
        <StatCard icon="📈" label={t('this_month')} value={`${stats?.monthlyEarnings?.toLocaleString() || 0}`} />
        <StatCard icon="🏆" label={t('total')} value={`${stats?.totalEarnings?.toLocaleString() || 0}`} />
      </div>

      {/* Ride Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard icon="🚗" label={t('rides')} value={stats?.totalRides || 0} />
        <StatCard icon="⭐" label={t('rating')} value={driver?.rating?.toFixed(1) || '5.0'} />
        <StatCard icon="📋" label={t('today')} value={stats?.todayRides || 0} />
      </div>

      {/* Car Info */}
      {driver?.car && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-card p-4"
        >
          <h3 className="font-semibold text-sm mb-3">{t('my_car')}</h3>
          <div className="space-y-2 text-sm">
            {[
              { label: t('brand'), value: driver.car.brand },
              { label: t('model'), value: driver.car.model },
              { label: t('color'), value: driver.car.color },
              { label: t('plate'), value: driver.car.plateNumber, mono: true },
            ].map((item, i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-white/5 last:border-0">
                <span className="text-gray-400">{item.label}</span>
                <span className={item.mono ? 'font-mono text-xs' : ''}>{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Pending Approval */}
      {!driver?.isApproved && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded-card p-4 text-center"
        >
          <p className="text-yellow-400 font-medium text-sm">{t('pending_approval')}</p>
          <p className="text-xs text-gray-500 mt-1">{t('account_reviewing')}</p>
        </motion.div>
      )}
    </div>
  );
}
