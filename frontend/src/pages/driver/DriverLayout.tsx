import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useTranslation } from '../../i18n';

export default function DriverLayout() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();

  return (
    <div className="h-full flex flex-col bg-[#0a0a1a]">
      <header className="px-4 py-3 pt-[var(--safe-area-top)] glass border-b border-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-bold text-sm shadow-glow">
              {user?.firstName?.[0]}
            </div>
            <div>
              <p className="font-semibold text-sm">{user?.firstName}</p>
              <p className="text-xs text-gray-500">{t('driver')}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/driver')}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-white bg-white/5 rounded-btn hover:bg-white/10 transition-all"
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
