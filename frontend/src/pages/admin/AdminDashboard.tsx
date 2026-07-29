import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { adminApi } from '../../services/api';
import { connectSocket, subscribeToDriverLocation, subscribeToAdminUpdates } from '../../services/socket';
import { useAuthStore } from '../../store/authStore';
import MapView from '../../components/ui/MapView';
import { districtConfig, getDefaultCenter } from '../../services/geo';
import { useTranslation } from '../../i18n';

interface DriverLocation {
  driverId: string;
  lat: number;
  lng: number;
  firstName?: string;
  carModel?: string;
  status?: string;
}

function StatCard({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-card p-3 sm:p-4 border-l-4 min-w-0 ${color}`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="text-lg sm:text-2xl font-bold truncate">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">{label}</div>
        </div>
        <div className="text-xl sm:text-3xl flex-shrink-0">{icon}</div>
      </div>
    </motion.div>
  );
}

export default function AdminDashboard() {
  const { t } = useTranslation();
  const token = useAuthStore((s) => s.token);
  const [driverLocations, setDriverLocations] = useState<Map<string, DriverLocation>>(new Map());
  const [mapCenter] = useState<[number, number]>([getDefaultCenter().lat, getDefaultCenter().lng]);

  const [driverCounts, setDriverCounts] = useState({ online: 0, busy: 0, offline: 0 });
  const [activeRides, setActiveRides] = useState<any[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.getDashboard(),
    refetchInterval: 15000,
  });

  const { data: locationsData } = useQuery({
    queryKey: ['admin', 'drivers-locations'],
    queryFn: () => adminApi.getDriversLocations(),
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!locationsData?.data?.drivers) return;
    const map = new Map<string, DriverLocation>();
    let online = 0, busy = 0, offline = 0;
    for (const d of locationsData.data.drivers) {
      if (d.currentLocation?.coordinates) {
        map.set(d._id, {
          driverId: d._id,
          lat: d.currentLocation.coordinates[1],
          lng: d.currentLocation.coordinates[0],
          firstName: d.userId?.firstName,
          carModel: d.car?.model,
          status: d.status,
        });
      }
      if (d.status === 'online') online++;
      else if (d.status === 'busy') busy++;
      else offline++;
    }
    setDriverLocations(map);
    setDriverCounts({ online, busy, offline });
  }, [locationsData]);

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);
    const unsub = subscribeToDriverLocation((data: any) => {
      setDriverLocations((prev) => {
        const next = new Map(prev);
        next.set(data.driverId, {
          ...next.get(data.driverId),
          driverId: data.driverId,
          lat: data.lat,
          lng: data.lng,
          status: data.status || next.get(data.driverId)?.status,
        });
        return next;
      });
    });

    const unsubAdmin = subscribeToAdminUpdates((msg: any) => {
      // admin:driver:update
      if (msg.driverId && msg.status) {
        setDriverCounts((prev) => {
          if (msg.status === 'online') return { ...prev, online: prev.online + 1, offline: Math.max(0, prev.offline - 1) };
          if (msg.status === 'offline') return { ...prev, offline: prev.offline + 1, online: Math.max(0, prev.online - 1) };
          if (msg.status === 'busy') return { ...prev, busy: prev.busy + 1, online: Math.max(0, prev.online - 1) };
          if (msg.status === 'free') return { ...prev, online: prev.online + 1, busy: Math.max(0, prev.busy - 1) };
          return prev;
        });
      }
      // admin:ride:update
      if (msg.rideId && msg.status) {
        setActiveRides((prev) => {
          const idx = prev.findIndex((r) => r.rideId === msg.rideId);
          if (msg.status === 'completed' || msg.status === 'cancelled') {
            return idx >= 0 ? prev.filter((_, i) => i !== idx) : prev;
          }
          const entry = { rideId: msg.rideId, orderNumber: msg.orderNumber, status: msg.status };
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = entry;
            return next;
          }
          return [entry, ...prev];
        });
      }
    });

    return () => { unsub(); unsubAdmin(); };
  }, [token]);

  const s = data?.data?.stats;
  const recentOrders = data?.data?.recentOrders || [];
  const recentUsers = data?.data?.recentUsers || [];
  const recentDrivers = data?.data?.recentDrivers || [];

  const chartData = [
    { name: t('users'), value: s?.totalUsers || 0 },
    { name: t('drivers_stat'), value: s?.totalDrivers || 0 },
    { name: t('online_stat'), value: s?.onlineDrivers || 0 },
    { name: t('active_stat'), value: s?.activeOrders || 0 },
  ];

  const revenueData = [
    { name: t('today'), revenue: s?.revenueToday || 0 },
    { name: t('this_week'), revenue: s?.revenueWeek || 0 },
    { name: t('this_month'), revenue: s?.revenueMonth || 0 },
    { name: t('total'), revenue: s?.totalRevenue || 0 },
  ];

  const driverMarkers = Array.from(driverLocations.values()).map((d) => ({
    lat: d.lat,
    lng: d.lng,
    label: `${d.firstName || t('driver')} • ${d.carModel || ''}`,
  }));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-card skeleton" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-card skeleton" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl font-bold">
        {t('dashboard_overview')}
      </motion.h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon="👥" label={t('total_users')} value={s?.totalUsers || 0} color="border-blue-500" />
        <StatCard icon="🚗" label={t('total_drivers')} value={s?.totalDrivers || 0} color="border-green-500" />
        <StatCard icon="🟢" label={t('online_now')} value={s?.onlineDrivers || 0} color="border-emerald-500" />
        <StatCard icon="📦" label={t('active_orders')} value={s?.activeOrders || 0} color="border-yellow-500" />
      </div>

      {/* Live Driver Status Counts */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <div className="glass rounded-card p-3 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg sm:text-2xl font-bold text-green-400">{driverCounts.online}</div>
              <div className="text-[10px] sm:text-xs text-gray-400">{t('online_drivers')}</div>
            </div>
            <div className="w-3 h-3 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>
        <div className="glass rounded-card p-3 border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg sm:text-2xl font-bold text-yellow-400">{driverCounts.busy}</div>
              <div className="text-[10px] sm:text-xs text-gray-400">{t('busy_drivers')}</div>
            </div>
            <div className="w-3 h-3 rounded-full bg-yellow-500 animate-pulse" />
          </div>
        </div>
        <div className="glass rounded-card p-3 border-l-4 border-gray-500">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-lg sm:text-2xl font-bold text-gray-400">{driverCounts.offline}</div>
              <div className="text-[10px] sm:text-xs text-gray-400">{t('offline_drivers')}</div>
            </div>
            <div className="w-3 h-3 rounded-full bg-gray-500" />
          </div>
        </div>
      </div>

      {/* Active Rides List */}
      {activeRides.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-card p-4">
          <h3 className="font-semibold mb-3 text-sm">{t('active_rides')} ({activeRides.length})</h3>
          <div className="space-y-1.5 max-h-40 overflow-y-auto scrollbar-thin">
            {activeRides.map((r: any) => (
              <div key={r.rideId} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                <span className="text-gray-400 font-mono truncate max-w-[80px]">#{r.orderNumber}</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                  r.status === 'accepted' ? 'bg-green-500/10 text-green-400' :
                  r.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' :
                  r.status === 'arrived' ? 'bg-yellow-500/10 text-yellow-400' :
                  'bg-gray-500/10 text-gray-400'
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <StatCard icon="💰" label={t('today_income')} value={`${(s?.revenueToday || 0).toLocaleString()}`} color="border-purple-500" />
        <StatCard icon="📅" label={t('this_week')} value={`${(s?.revenueWeek || 0).toLocaleString()}`} color="border-indigo-500" />
        <StatCard icon="📆" label={t('this_month')} value={`${(s?.revenueMonth || 0).toLocaleString()}`} color="border-pink-500" />
        <StatCard icon="💵" label={t('total_revenue')} value={`${(s?.totalRevenue || 0).toLocaleString()}`} color="border-orange-500" />
      </div>

      <div className="grid grid-cols-3 gap-2 sm:gap-3">
        <StatCard icon="✅" label={t('completed_today')} value={s?.completedToday || 0} color="border-teal-500" />
        <StatCard icon="❌" label={t('cancelled_today')} value={s?.cancelledToday || 0} color="border-red-500" />
        <StatCard icon="⏳" label={t('pending_orders')} value={s?.pendingOrders || 0} color="border-amber-500" />
      </div>

      {/* Live Driver Map */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-card overflow-hidden">
        <div className="p-3 sm:p-4 flex items-center justify-between border-b border-white/5">
          <h3 className="font-semibold text-sm">{t('live_drivers_map')} ({driverLocations.size})</h3>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] text-gray-400 font-medium">{t('live')}</span>
          </div>
        </div>
        <div className="h-56 sm:h-64 md:h-80">
          <MapView
            center={mapCenter}
            zoom={districtConfig.zoom}
            markers={driverMarkers}
            showDistrict
            showSatelliteToggle={false}
          />
        </div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-card p-4">
          <h3 className="font-semibold mb-3 text-sm">{t('overview')}</h3>
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <XAxis dataKey="name" tick={{ fill: '#8e8e93', fontSize: 10 }} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }} />
                <Bar dataKey="value" fill="#0c8ee7" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-card p-4">
          <h3 className="font-semibold mb-3 text-sm">{t('revenue')}</h3>
          <div className="h-40 sm:h-48">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <XAxis dataKey="name" tick={{ fill: '#8e8e93', fontSize: 10 }} />
                <YAxis hide />
                <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 12, color: '#fff', fontSize: 12 }} />
                <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Recent Lists */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-card p-4">
          <h3 className="font-semibold mb-3 text-sm">{t('recent_orders')}</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {recentOrders.length === 0 && <p className="text-xs text-gray-500 py-2">{t('no_orders_yet')}</p>}
            {recentOrders.map((o: any) => (
              <div key={o._id} className="flex items-center justify-between text-xs py-2 border-b border-white/5 last:border-0">
                <span className="text-gray-400 font-mono truncate max-w-[80px] sm:max-w-[120px]">#{o.orderNumber}</span>
                <span className="text-gray-300 truncate max-w-[80px] sm:max-w-[100px]">{o.customerId?.firstName}</span>
                <span className="text-gray-500 text-[10px]">{o.status}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-card p-4">
          <h3 className="font-semibold mb-3 text-sm">{t('recent_users')}</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {recentUsers.length === 0 && <p className="text-xs text-gray-500 py-2">{t('no_users_yet')}</p>}
            {recentUsers.map((u: any) => (
              <div key={u._id} className="flex items-center gap-2 text-xs py-2 border-b border-white/5 last:border-0">
                <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold text-[10px] flex-shrink-0">
                  {u.firstName?.[0] || '?'}
                </div>
                <span className="text-gray-300 truncate flex-1 min-w-0">{u.firstName} {u.lastName}</span>
                <span className="text-gray-500 text-[10px] flex-shrink-0">{u.role}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-card p-4">
          <h3 className="font-semibold mb-3 text-sm">{t('recent_drivers')}</h3>
          <div className="space-y-1.5 max-h-48 overflow-y-auto scrollbar-thin">
            {recentDrivers.length === 0 && <p className="text-xs text-gray-500 py-2">{t('no_drivers_yet')}</p>}
            {recentDrivers.map((d: any) => (
              <div key={d._id} className="flex items-center gap-2 text-xs py-2 border-b border-white/5 last:border-0">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${d.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className="text-gray-300 truncate flex-1 min-w-0">{d.userId?.firstName}</span>
                <span className="text-gray-500 text-[10px] flex-shrink-0">{d.car?.model}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
