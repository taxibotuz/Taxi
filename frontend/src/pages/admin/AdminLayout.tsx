import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const adminTabs = [
  { path: '/admin', label: 'Dashboard', icon: '📊' },
  { path: '/admin/drivers', label: 'Drivers', icon: '🚗' },
  { path: '/admin/orders', label: 'Orders', icon: '📦' },
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/reports', label: 'Reports', icon: '📈' },
  { path: '/admin/notifications', label: 'Notify', icon: '📢' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
  { path: '/admin/error-logs', label: 'Error Logs', icon: '🛡️' },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="h-full flex flex-col bg-[#0a0a1a]">
      <header className="px-4 py-3 pt-[var(--safe-area-top)] glass">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">⚡ Admin Panel</h1>
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide">
        {adminTabs.map((tab) => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={`px-4 py-2 rounded-xl whitespace-nowrap text-sm transition-all ${
              location.pathname === tab.path
                ? 'bg-primary-500 text-white'
                : 'bg-white/10 text-gray-400'
            }`}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <main className="flex-1 overflow-y-auto scrollbar-hide px-4">
        <Outlet />
      </main>
    </div>
  );
}
