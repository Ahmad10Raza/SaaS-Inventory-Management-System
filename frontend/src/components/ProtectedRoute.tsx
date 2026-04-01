import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredPermission?: string;
}

export function ProtectedRoute({ children, requiredPermission }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Force users to setup a new password strictly
  if (user?.isTemporaryPassword && location.pathname !== '/setup-password') {
    return <Navigate to="/setup-password" replace />;
  }

  if (requiredPermission && user) {
    const hasPermission =
      user.role === 'super_admin' ||
      user.role === 'company_owner' ||
      user.permissions.includes(requiredPermission);

    if (!hasPermission) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}
