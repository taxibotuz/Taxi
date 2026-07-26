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
    { path: '/profile', label: t('nav_profile'), icon: '👤' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 glass px-4 pb-[var(--safe-area-bottom)]">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center justify-center w-16 h-full"
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-0.5 w-8 h-1 rounded-full bg-primary-500"
                />
              )}
              <span className="text-xl">{tab.icon}</span>
              <span className={`text-[10px] mt-0.5 ${isActive ? 'text-primary-500 font-medium' : 'text-gray-400'}`}>
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
