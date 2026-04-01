import React from 'react';
import { useAuthStore } from '@/stores/authStore';

interface CanProps {
  permission?: string;
  role?: string | string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Reusable component for conditional rendering based on RBAC
 * Usage:
 * <Can permission="product.create">
 *   <button>Add Product</button>
 * </Can>
 */
export const Can: React.FC<CanProps> = ({ permission, role, children, fallback = null }) => {
  const { hasPermission, hasRole } = useAuthStore();

  let allowed = true;

  if (permission) {
    allowed = hasPermission(permission);
  }

  if (allowed && role) {
    allowed = hasRole(role);
  }

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

export default Can;
