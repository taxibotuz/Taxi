import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../services/api';

export default function AdminRoute() {
  const { user, isAuthenticated, logout } = useAuthStore();
  const [verifying, setVerifying] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const verify = async () => {
      try {
        const { data } = await authApi.getProfile();
        if (!cancelled) {
          if (data.user?.role === 'admin') {
            setAuthorized(true);
          } else {
            setAuthorized(false);
          }
        }
      } catch {
        if (!cancelled) {
          logout();
        }
      } finally {
        if (!cancelled) setVerifying(false);
      }
    };
    if (isAuthenticated) {
      verify();
    } else {
      setVerifying(false);
    }
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }

  if (verifying) {
    return <div className="h-full flex items-center justify-center bg-[#0a0a1a]"><div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!authorized || user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
