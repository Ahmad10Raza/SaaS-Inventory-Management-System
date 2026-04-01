import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Company } from '@/types';
import api from '@/services/api';

interface AuthState {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasSeenTour: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: {
    companyName: string;
    industry: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    phone?: string;
    businessType?: string;
    country?: string;
    currency?: string;
    warehouseCount?: number;
    employeeCount?: number;
    expectedProductCount?: number;
    featurePreferences?: {
      batchTracking?: boolean;
      serialTracking?: boolean;
      expiryTracking?: boolean;
      manufacturingModule?: boolean;
      warehouseTransfers?: boolean;
      approvalWorkflow?: boolean;
    };
  }) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  clearError: () => void;
  setCompany: (company: Company) => void;
  markTourAsSeen: () => void;
  replayTour: () => void;
  
  // RBAC Helpers
  hasPermission: (permission: string) => boolean;
  hasRole: (role: string | string[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      company: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasSeenTour: true, // Default to true so legacy users don't see it
      
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/login', { email, password });
          const { accessToken, refreshToken, user, company } = response.data;
          
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          
          set({
            user,
            company,
            isAuthenticated: true,
            isLoading: false,
            hasSeenTour: user.hasSeenTour,
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'Login failed. Please try again.',
          });
          throw error;
        }
      },
      
      register: async (data) => {
        set({ isLoading: true, error: null });
        try {
          const response = await api.post('/auth/register', data);
          const { accessToken, refreshToken, user, company } = response.data;
          
          localStorage.setItem('accessToken', accessToken);
          localStorage.setItem('refreshToken', refreshToken);
          
          set({
            user,
            company,
            isAuthenticated: true,
            isLoading: false,
            hasSeenTour: false, // Explicitly false for new signups
          });
        } catch (error: any) {
          set({
            isLoading: false,
            error: error.response?.data?.message || 'Registration failed. Please try again.',
          });
          throw error;
        }
      },
      
      logout: () => {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        set({
          user: null,
          company: null,
          isAuthenticated: false,
          error: null,
        });
      },
      
      fetchProfile: async () => {
        try {
          const response = await api.get('/auth/profile');
          const { user, company } = response.data;
          set({
            user,
            company,
            isAuthenticated: true,
            hasSeenTour: user.hasSeenTour,
          });
        } catch {
          set({
            user: null,
            company: null,
            isAuthenticated: false,
          });
        }
      },
      
      clearError: () => set({ error: null }),
      setCompany: (company) => set({ company }),
      markTourAsSeen: async () => {
        try {
          // 1. Tell backend
          await api.post('/auth/complete-tour');
          // 2. Update local state
          const user = get().user;
          if (user) {
            set({ 
              user: { ...user, hasSeenTour: true },
              hasSeenTour: true 
            });
          }
        } catch (error) {
          console.error('Failed to mark tour as seen', error);
          set({ hasSeenTour: true });
        }
      },
      replayTour: () => set({ hasSeenTour: false }),

      hasPermission: (permission: string) => {
        const user = get().user;
        if (!user) return false;
        
        // Admins have all permissions
        if (user.role === 'super_admin' || user.role === 'company_owner') return true;
        
        if (!user.permissions) return false;
        
        // Exact match
        if (user.permissions.includes(permission)) return true;
        
        // Wildcard match (e.g. 'product.*')
        const module = permission.split('.')[0];
        if (user.permissions.includes(`${module}.*`) || user.permissions.includes('*')) return true;
        
        return false;
      },

      hasRole: (role: string | string[]) => {
        const user = get().user;
        if (!user) return false;
        
        if (Array.isArray(role)) {
          return role.includes(user.role);
        }
        return user.role === role;
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        company: state.company,
        isAuthenticated: state.isAuthenticated,
        hasSeenTour: state.hasSeenTour,
      }),
    }
  )
);
