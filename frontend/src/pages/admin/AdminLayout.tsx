import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../i18n';

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const adminTabs = [
    { path: '/admin', label: t('dashboard_overview'), icon: '📊' },
    { path: '/admin/drivers', label: t('admin_drivers'), icon: '🚗' },
    { path: '/admin/orders', label: t('admin_orders'), icon: '📦' },
    { path: '/admin/users', label: t('admin_users'), icon: '👥' },
    { path: '/admin/reports', label: t('admin_reports'), icon: '📈' },
    { path: '/admin/notifications', label: t('admin_notify'), icon: '📢' },
    { path: '/admin/settings', label: t('admin_settings'), icon: '⚙️' },
    { path: '/admin/error-logs', label: t('admin_error_logs'), icon: '🛡️' },
    { path: '/admin/drivers-performance', label: t('driver_performance'), icon: '📊' },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="h-full flex bg-[#0a0a1a]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0 glass border-r border-white/5">
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-lg font-bold shadow-glow">
              T
            </div>
            <div>
              <h1 className="font-bold text-sm">{t('admin_panel')}</h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                <span className="text-[10px] text-gray-500">{t('online')}</span>
              </div>
            </div>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-hide">
          {adminTabs.map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                isActive(tab.path)
                  ? 'bg-primary-500/15 text-primary-400 font-medium shadow-sm'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
              }`}
            >
              <span className="text-base">{tab.icon}</span>
              <span className="truncate">{tab.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-72 glass z-50 lg:hidden flex flex-col"
            >
              <div className="p-5 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary-500 flex items-center justify-center text-lg font-bold shadow-glow">
                    T
                  </div>
                  <h1 className="font-bold">{t('admin_panel')}</h1>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 text-gray-400 text-lg"
                >
                  ✕
                </button>
              </div>

              <nav className="flex-1 overflow-y-auto p-3 space-y-1 scrollbar-hide">
                {adminTabs.map((tab) => (
                  <button
                    key={tab.path}
                    onClick={() => { navigate(tab.path); setSidebarOpen(false); }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                      isActive(tab.path)
                        ? 'bg-primary-500/15 text-primary-400 font-medium'
                        : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                    }`}
                  >
                    <span className="text-base">{tab.icon}</span>
                    <span className="truncate">{tab.label}</span>
                  </button>
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="px-4 py-3 pt-[var(--safe-area-top)] glass border-b border-white/5 flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl hover:bg-white/10 text-gray-300"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>

          <h1 className="text-lg font-bold lg:hidden">{t('admin_panel')}</h1>

          <div className="hidden lg:flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-gray-500">{t('system_active')}</span>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </header>

        {/* Mobile Tabs - scrollable */}
        <div className="lg:hidden flex gap-1.5 overflow-x-auto px-3 py-2.5 border-b border-white/5 scrollbar-hide flex-shrink-0">
          {adminTabs.map((tab) => (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-medium transition-all flex-shrink-0 ${
                isActive(tab.path)
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto scrollbar-hide px-4 pb-8 pt-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
