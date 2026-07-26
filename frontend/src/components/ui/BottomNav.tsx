import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const tabs = [
  { path: '/', label: 'Home', icon: '🏠' },
  { path: '/history', label: 'History', icon: '📋' },
  { path: '/profile', label: 'Profile', icon: '👤' },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

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
