import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';
import { connectSocket } from '../../services/socket';
import toast from 'react-hot-toast';

export default function AuthPage() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [loading, setLoading] = useState(false);

  const handleTelegramLogin = async () => {
    setLoading(true);

    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.initDataUnsafe?.user) {
        const user = tg.initDataUnsafe.user;
        const { data } = await authApi.telegramLogin({
          id: user.id,
          first_name: user.first_name,
          last_name: user.last_name,
          username: user.username,
          photo_url: user.photo_url,
        });

        setAuth(data.token, data.user);
        connectSocket(data.token);
        navigate('/', { replace: true });
        toast.success(`Welcome, ${data.user.firstName}!`);
      } else {
        // Demo mode for development
        const demoUser = { id: 123456789, first_name: 'Demo', last_name: 'User' };
        const { data } = await authApi.telegramLogin({
          id: demoUser.id,
          first_name: demoUser.first_name,
          last_name: demoUser.last_name,
        });

        setAuth(data.token, data.user);
        connectSocket(data.token);
        navigate('/', { replace: true });
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

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
        onClick={handleTelegramLogin}
        disabled={loading}
        className="w-full max-w-sm py-4 rounded-2xl bg-primary-500 text-white font-semibold text-lg shadow-lg shadow-primary-500/30 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-3"
      >
        {loading ? (
          <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <span>✈️</span>
            Continue with Telegram
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
