import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from '../../i18n';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const adminTabs = [
    { path: '/admin', label: t('dashboard_overview'), icon: '📊' },
    { path: '/admin/drivers', label: t('admin_drivers'), icon: '🚗' },
    { path: '/admin/orders', label: t('admin_orders'), icon: '📦' },
    { path: '/admin/users', label: t('admin_users'), icon: '👥' },
    { path: '/admin/reports', label: t('admin_reports'), icon: '📈' },
    { path: '/admin/notifications', label: t('admin_notify'), icon: '📢' },
    { path: '/admin/settings', label: t('admin_settings'), icon: '⚙️' },
    { path: '/admin/error-logs', label: t('admin_error_logs'), icon: '🛡️' },
  ];

  return (
    <div className="h-full flex flex-col bg-[#0a0a1a]">
      <header className="px-4 py-3 pt-[var(--safe-area-top)] glass">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold">{t('admin_panel')}</h1>
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
