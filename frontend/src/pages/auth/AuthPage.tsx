import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { connectSocket } from '../../services/socket';
import toast from 'react-hot-toast';

function getTelegramUser(): any {
  const unsafe = (window as any).__TG_INIT_DATA_UNSAFE;
  if (unsafe?.user) return unsafe.user;
  const tg = (window as any).Telegram?.WebApp;
  return tg?.initDataUnsafe?.user || null;
}

function isTelegramEnv(): boolean {
  const tg = (window as any).Telegram?.WebApp;
  return !!(tg || (window as any).__TG_INIT_DATA_UNSAFE);
}

export default function AuthPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);
  const [initLoading, setInitLoading] = useState(true);
  const attempted = useRef(false);

  useEffect(() => {
    if (attempted.current) return;
    attempted.current = true;

    const tgUser = getTelegramUser();
    if (tgUser) {
      doLogin(tgUser);
    } else {
      setInitLoading(false);
    }
  }, []);

  const doLogin = async (tgUser: any) => {
    setLoading(true);
    try {
      const { data } = await authApi.telegramLogin({
        id: tgUser.id,
        first_name: tgUser.first_name,
        last_name: tgUser.last_name,
        username: tgUser.username,
        photo_url: tgUser.photo_url,
      });

      setAuth(data.token, data.user);
      connectSocket(data.token);
      navigate('/', { replace: true });
      toast.success(`Welcome, ${data.user.firstName}!`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
      setInitLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const handleBrowserLogin = async () => {
    setLoading(true);
    try {
      const demoUser = { id: 123456789, first_name: 'Demo', last_name: 'User' };
      const { data } = await authApi.telegramLogin({
        id: demoUser.id,
        first_name: demoUser.first_name,
        last_name: demoUser.last_name,
      });

      setAuth(data.token, data.user);
      connectSocket(data.token);
      navigate('/', { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  if (initLoading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-[#0a0a1a]">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full border-2 border-primary-500 border-t-transparent animate-spin" />
          <p className="text-gray-400 text-sm">Connecting...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-[#0a0a1a] px-6">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <motion.div
          animate={{
            y: [0, -10, 0],
            rotate: [0, 5, -5, 0],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-7xl mb-6"
        >
          🚕
        </motion.div>
        <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-primary-300 to-primary-500 bg-clip-text text-transparent">
          TaxiGo
        </h1>
        <p className="text-gray-400">Premium Taxi & Delivery Service</p>
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={handleBrowserLogin}
        disabled={loading}
        className="w-full max-w-sm py-4 rounded-2xl bg-primary-500 text-white font-semibold text-lg shadow-lg shadow-primary-500/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
      >
        {loading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <span>✈️</span>
            {isTelegramEnv() ? 'Continue with Telegram' : 'Continue as Guest (Browser Mode)'}
          </>
        )}
      </motion.button>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mt-6 text-xs text-gray-500 text-center max-w-xs"
      >
        By continuing, you agree to our Terms of Service and Privacy Policy
      </motion.p>
    </div>
  );
}
