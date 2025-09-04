import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { auth, clearTokens, getAccessToken } from './api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  email: string;
  created_at: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      
      login: async (email: string, password: string) => {
        try {
          set({ isLoading: true });
          const response = await auth.login(email, password);
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
          
          toast.success('Successfully logged in!');
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Failed to login';
          toast.error(message);
          throw error;
        }
      },
      
      register: async (username: string, email: string, password: string) => {
        try {
          set({ isLoading: true });
          const response = await auth.register({ username, email, password });
          
          set({
            user: response.user,
            isAuthenticated: true,
            isLoading: false,
          });
          
          toast.success('Account created successfully!');
        } catch (error: any) {
          set({ isLoading: false });
          const message = error.response?.data?.error || 'Failed to register';
          toast.error(message);
          throw error;
        }
      },
      
      logout: async () => {
        try {
          await auth.logout();
        } finally {
          set({
            user: null,
            isAuthenticated: false,
          });
          clearTokens();
          toast.success('Successfully logged out');
        }
      },
      
      checkAuth: async () => {
        // Check if we have an access token
        const token = getAccessToken();
        if (!token) {
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
          return;
        }
        
        try {
          set({ isLoading: true });
          // Verify the token by fetching user profile
          const response = await fetch('/api/users/profile', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
          
          if (response.ok) {
            const userData = await response.json();
            set({
              user: userData,
              isAuthenticated: true,
              isLoading: false,
            });
          } else {
            // Token is invalid
            clearTokens();
            set({
              user: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } catch (error) {
          // Network error or token invalid
          clearTokens();
          set({
            user: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      },
      
      setUser: (user: User | null) => {
        set({
          user,
          isAuthenticated: !!user,
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);