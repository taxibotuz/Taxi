import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useTranslation } from '../../i18n';

export default function BottomNav() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { path: '/', label: t('nav_home'), icon: '🏠' },
    { path: '/history', label: t('nav_history'), icon: '📋' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass border-t border-white/5" style={{ paddingBottom: 'max(8px, var(--safe-area-bottom))' }}>
      <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center justify-center w-16 h-14 rounded-xl active:scale-95 transition-transform"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 w-8 h-0.5 rounded-full bg-primary-500"
                />
              )}
              <span className="text-xl leading-none">{tab.icon}</span>
              <span className={`text-[10px] mt-1 ${isActive ? 'text-primary-400 font-medium' : 'text-gray-500'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
