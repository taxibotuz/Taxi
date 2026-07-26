import { Outlet, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../i18n';

export default function DriverLayout() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-[#0a0a1a]">
      <header className="px-4 py-3 pt-[var(--safe-area-top)] glass">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold">
              {user?.firstName?.[0]}
            </div>
            <div>
              <p className="font-semibold text-sm">{user?.firstName}</p>
              <p className="text-xs text-gray-400">{t('driver')}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/driver')}
            className="text-sm text-gray-400"
          >
            {t('dashboard')}
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto scrollbar-hide">
        <Outlet />
      </main>
    </div>
  );
}
