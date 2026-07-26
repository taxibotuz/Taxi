import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { adminApi } from '../../services/api';

const COLORS = ['#0c8ee7', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function AdminDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'dashboard'],
    queryFn: () => adminApi.getDashboard(),
    refetchInterval: 15000,
  });

  const s = data?.data?.stats;
  const recentOrders = data?.data?.recentOrders || [];
  const recentUsers = data?.data?.recentUsers || [];
  const recentDrivers = data?.data?.recentDrivers || [];

  const chartData = [
    { name: 'Users', value: s?.totalUsers || 0 },
    { name: 'Drivers', value: s?.totalDrivers || 0 },
    { name: 'Online', value: s?.onlineDrivers || 0 },
    { name: 'Active', value: s?.activeOrders || 0 },
  ];

  const revenueData = [
    { name: 'Today', revenue: s?.revenueToday || 0 },
    { name: 'Week', revenue: s?.revenueWeek || 0 },
    { name: 'Month', revenue: s?.revenueMonth || 0 },
    { name: 'Total', revenue: s?.totalRevenue || 0 },
  ];

  const StatCard = ({ label, value, icon, color }: { label: string; value: string | number; icon: string; color: string }) => (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`glass rounded-2xl p-4 border-l-4 ${color}`}>
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
        <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}</div>
        <div className="grid grid-cols-2 gap-3">{[1,2,3,4].map(i => <div key={i} className="h-20 bg-white/5 rounded-2xl animate-pulse" />)}</div>
      </div>
    );
  }

  return (
    <div className="py-4 space-y-4">
      <motion.h1 initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xl font-bold">Dashboard Overview</motion.h1>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="👥" label="Total Users" value={s?.totalUsers || 0} color="border-blue-500" />
        <StatCard icon="🚗" label="Total Drivers" value={s?.totalDrivers || 0} color="border-green-500" />
        <StatCard icon="🟢" label="Online Now" value={s?.onlineDrivers || 0} color="border-emerald-500" />
        <StatCard icon="📦" label="Active Orders" value={s?.activeOrders || 0} color="border-yellow-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="💰" label="Today Income" value={`${(s?.revenueToday || 0).toLocaleString()} sum`} color="border-purple-500" />
        <StatCard icon="📅" label="This Week" value={`${(s?.revenueWeek || 0).toLocaleString()} sum`} color="border-indigo-500" />
        <StatCard icon="📆" label="This Month" value={`${(s?.revenueMonth || 0).toLocaleString()} sum`} color="border-pink-500" />
        <StatCard icon="💵" label="Total Revenue" value={`${(s?.totalRevenue || 0).toLocaleString()} sum`} color="border-orange-500" />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatCard icon="✅" label="Completed Today" value={s?.completedToday || 0} color="border-teal-500" />
        <StatCard icon="❌" label="Cancelled Today" value={s?.cancelledToday || 0} color="border-red-500" />
        <StatCard icon="⏳" label="Pending Orders" value={s?.pendingOrders || 0} color="border-amber-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-4">
          <h3 className="font-semibold mb-3 text-sm">📊 Overview</h3>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={chartData}>
              <XAxis dataKey="name" tick={{ fill: '#8e8e93', fontSize: 10 }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, color: '#fff' }} />
              <Bar dataKey="value" fill="#0c8ee7" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-4">
          <h3 className="font-semibold mb-3 text-sm">💰 Revenue</h3>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={revenueData}>
              <XAxis dataKey="name" tick={{ fill: '#8e8e93', fontSize: 10 }} />
              <YAxis hide />
              <Tooltip contentStyle={{ background: '#1a1a2e', border: 'none', borderRadius: 8, color: '#fff' }} />
              <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-4">
          <h3 className="font-semibold mb-3 text-sm">📋 Recent Orders</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentOrders.length === 0 && <p className="text-xs text-gray-500">No orders yet</p>}
            {recentOrders.map((o: any) => (
              <div key={o._id} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                <span className="text-gray-400 truncate max-w-[120px]">#{o.orderNumber}</span>
                <span className="text-gray-300">{o.customerId?.firstName}</span>
                <span className="text-gray-500">{o.status}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-4">
          <h3 className="font-semibold mb-3 text-sm">👤 Recent Users</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentUsers.length === 0 && <p className="text-xs text-gray-500">No users yet</p>}
            {recentUsers.map((u: any) => (
              <div key={u._id} className="flex items-center gap-2 text-xs py-1.5 border-b border-white/5 last:border-0">
                <div className="w-6 h-6 rounded-full bg-primary-500/20 flex items-center justify-center text-primary-500 font-bold text-[10px]">
                  {u.firstName?.[0] || '?'}
                </div>
                <span className="text-gray-300 truncate max-w-[100px]">{u.firstName} {u.lastName}</span>
                <span className="text-gray-500 ml-auto">{u.role}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass rounded-2xl p-4">
          <h3 className="font-semibold mb-3 text-sm">🚗 Recent Drivers</h3>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {recentDrivers.length === 0 && <p className="text-xs text-gray-500">No drivers yet</p>}
            {recentDrivers.map((d: any) => (
              <div key={d._id} className="flex items-center gap-2 text-xs py-1.5 border-b border-white/5 last:border-0">
                <div className={`w-2 h-2 rounded-full ${d.isOnline ? 'bg-green-500' : 'bg-gray-500'}`} />
                <span className="text-gray-300 truncate max-w-[100px]">{d.userId?.firstName}</span>
                <span className="text-gray-500 ml-auto">{d.car?.model}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
