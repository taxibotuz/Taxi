import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { driversApi } from '../../services/api';
import { isInsideDistrict } from '../../services/geo';
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

  const StatCard = ({ label, value, icon }: { label: string; value: string | number; icon: string }) => (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass rounded-2xl p-4 text-center"
    >
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-4 pb-8 space-y-4">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <h1 className="text-2xl font-bold">{t('driver_panel')}</h1>
        {isInDistrict ? (
          <button
            onClick={() => toggleMutation.mutate()}
            className={`px-6 py-2 rounded-xl font-semibold text-sm transition-all ${
              driver?.isOnline
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
            }`}
          >
            {driver?.isOnline ? t('online') : t('offline')}
          </button>
        ) : (
          <div className="px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30 text-yellow-400 text-xs font-medium text-center">
            {t('tortkol_outside')}
          </div>
        )}
      </motion.div>

      {activeRide && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="glass rounded-2xl p-4 border-l-4 border-green-500"
        >
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
            <span className="font-semibold">{t('active_ride')}</span>
          </div>
          <p className="text-sm text-gray-400 mt-2">
            #{activeRide.orderNumber} • {activeRide.pickup.address.slice(0, 30)}...
          </p>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="💰" label={t('today')} value={`${stats?.todayEarnings?.toLocaleString() || 0} ${t('sum')}`} />
        <StatCard icon="📊" label={t('this_week')} value={`${stats?.weeklyEarnings?.toLocaleString() || 0} ${t('sum')}`} />
        <StatCard icon="📈" label={t('this_month')} value={`${stats?.monthlyEarnings?.toLocaleString() || 0} ${t('sum')}`} />
        <StatCard icon="🏆" label={t('total')} value={`${stats?.totalEarnings?.toLocaleString() || 0} ${t('sum')}`} />
      </div>

      <div className="grid grid-cols-3 gap-3">
        <StatCard icon="🚗" label={t('rides')} value={stats?.totalRides || 0} />
        <StatCard icon="⭐" label={t('rating')} value={driver?.rating?.toFixed(1) || '5.0'} />
        <StatCard icon="📋" label={t('today')} value={stats?.todayRides || 0} />
      </div>

      {driver?.car && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="glass rounded-2xl p-4"
        >
          <h3 className="font-semibold mb-3">{t('my_car')}</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">{t('brand')}</span>
              <span>{driver.car.brand}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('model')}</span>
              <span>{driver.car.model}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('color')}</span>
              <span>{driver.car.color}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">{t('plate')}</span>
              <span className="font-mono">{driver.car.plateNumber}</span>
            </div>
          </div>
        </motion.div>
      )}

      {!driver?.isApproved && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-yellow-500/10 border border-yellow-500/30 rounded-2xl p-4 text-center"
        >
          <p className="text-yellow-400 font-medium">{t('pending_approval')}</p>
          <p className="text-xs text-gray-400 mt-1">{t('account_reviewing')}</p>
        </motion.div>
      )}
    </div>
  );
}
