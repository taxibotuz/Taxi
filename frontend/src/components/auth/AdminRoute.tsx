import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export default function AdminRoute() {
  const { user, isAuthenticated } = useAuthStore();

  console.group('🔐 AdminRoute');
  console.log('isAuthenticated:', isAuthenticated);
  console.log('user:', user);
  console.log('user?.role:', user?.role);
  console.log('is admin?', user?.role === 'admin');
  console.groupEnd();

  if (!isAuthenticated) {
    console.warn('AdminRoute: NOT authenticated, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  if (user?.role !== 'admin') {
    console.warn('AdminRoute: NOT admin (role=' + user?.role + '), redirecting to /');
    return <Navigate to="/" replace />;
  }

  console.log('AdminRoute: ALLOWED');
  return <Outlet />;
}
