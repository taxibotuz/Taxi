import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuthStore } from './store/authStore';
import { connectSocket, disconnectSocket } from './services/socket';
import { authApi } from './services/api';
import SplashScreen from './components/ui/SplashScreen';
import CustomerLayout from './pages/customer/CustomerLayout';
import CustomerHome from './pages/customer/CustomerHome';
import RideSearch from './pages/customer/RideSearch';
import RideHistory from './pages/customer/RideHistory';
import DriverLayout from './pages/driver/DriverLayout';
import DriverDashboard from './pages/driver/DriverDashboard';
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AuthPage from './pages/auth/AuthPage';

function App() {
  const { isAuthenticated, token, user, setAuth, logout } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const initApp = async () => {
      try {
        if (token) {
          const { data } = await authApi.verifyToken();
          if (data.valid) {
            const profile = await authApi.getProfile();
            setAuth(token, profile.data.user);
            connectSocket(token);
          } else {
            logout();
          }
        }
      } catch {
        logout();
      } finally {
        setLoading(false);
      }
    };

    initApp();

    return () => {
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    try {
      const initData = (window as any).__TG_INIT_DATA || '';
      useAuthStore.getState().setInitData(initData);

      const colorScheme = (window as any).__TG_COLOR_SCHEME;
      if (colorScheme === 'light') {
        setTheme('light');
      }
    } catch {
      // ignore
    }
  }, []);

  if (loading) return <SplashScreen />;

  return (
    <div className={`h-full w-full ${theme === 'dark' ? 'dark' : ''}`}>
      <AnimatePresence mode="wait">
        <Routes>
          {!isAuthenticated ? (
            <>
              <Route path="/auth" element={<AuthPage />} />
              <Route path="*" element={<Navigate to="/auth" replace />} />
            </>
          ) : user?.role === 'driver' ? (
            <>
              <Route path="/driver" element={<DriverLayout />}>
                <Route index element={<DriverDashboard />} />
                <Route path="history" element={<RideHistory />} />
              </Route>
              <Route path="/*" element={<Navigate to="/driver" replace />} />
            </>
          ) : (
            <>
              {user?.role === 'admin' && (
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="drivers" element={<div>Drivers</div>} />
                  <Route path="orders" element={<div>Orders</div>} />
                  <Route path="users" element={<div>Users</div>} />
                  <Route path="settings" element={<div>Settings</div>} />
                </Route>
              )}
              <Route element={<CustomerLayout />}>
                <Route path="/" element={<CustomerHome />} />
                <Route path="/search" element={<RideSearch />} />
                <Route path="/history" element={<RideHistory />} />
              </Route>
              <Route path="/*" element={<Navigate to="/" replace />} />
            </>
          )}
        </Routes>
      </AnimatePresence>
    </div>
  );
}

export default App;
