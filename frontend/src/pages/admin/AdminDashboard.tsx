import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { adminApi } from '../../services/api';

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.getDashboard(),
    refetchInterval: 15000,
  });

  const stats = data?.data?.stats;
  const recentOrders = data?.data?.recentOrders;

  const StatCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) => (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`glass rounded-2xl p-4 border-l-4 ${color}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="text-2xl font-bold">{typeof value === 'number' ? value.toLocaleString() : value}</div>
          <div className="text-xs text-gray-400 mt-1">{label}</div>
        </div>
        <div className="text-3xl">{icon}</div>
      </div>
    </motion.div>
  );

  if (isLoading) {
    return (
      <div className="py-4 space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-xl font-bold"
      >
        Dashboard Overview
      </motion.h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="👥" label="Total Users" value={stats?.totalUsers || 0} color="border-blue-500" />
        <StatCard icon="🚗" label="Total Drivers" value={stats?.totalDrivers || 0} color="border-green-500" />
        <StatCard icon="🟢" label="Online Now" value={stats?.onlineDrivers || 0} color="border-emerald-500" />
        <StatCard icon="📦" label="Active Orders" value={stats?.activeOrders || 0} color="border-yellow-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="💰" label="Today Revenue" value={`${(stats?.revenueToday || 0).toLocaleString()} sum`} color="border-purple-500" />
        <StatCard icon="💵" label="Total Revenue" value={`${(stats?.totalRevenue || 0).toLocaleString()} sum`} color="border-orange-500" />
        <StatCard icon="✅" label="Completed Today" value={stats?.completedToday || 0} color="border-teal-500" />
        <StatCard icon="⏳" label="Pending" value={stats?.pendingOrders || 0} color="border-red-500" />
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="glass rounded-2xl p-4"
      >
        <h3 className="font-semibold mb-3">📋 Recent Orders</h3>
        <div className="space-y-2">
          {recentOrders?.slice(0, 5).map((order: any) => (
            <div key={order._id} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
              <div>
                <span className="text-gray-400">#{order.orderNumber}</span>
                <span className="ml-2">{order.customerId?.firstName}</span>
              </div>
              <span className="text-xs text-gray-400">
                {order.pricing?.total?.toLocaleString()} sum • {order.status}
              </span>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
