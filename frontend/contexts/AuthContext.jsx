'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { getCurrentUser } from '@/lib/api';

const AuthContext = createContext({});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          console.log('🔐 Local token detected, fetching user data...');
          const userData = await getCurrentUser(token);
          setUser({
            ...userData.user,
            token
          });
        } else {
          console.log('🔓 No local token found');
          setUser(null);
        }
      } catch (error) {
        console.error('❌ Auth initialization error:', error);
        localStorage.removeItem('token');
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  /**
   * Internal SignIn Helper (Used after login API succeeds)
   */
  const signInWithToken = async (customToken) => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔐 Saving token and getting user data...');
      localStorage.setItem('token', customToken);
      
      const userData = await getCurrentUser(customToken);
      setUser({
        ...userData.user,
        token: customToken
      });
      return userData;
    } catch (error) {
      console.error('❌ Sign in error:', error);
      localStorage.removeItem('token');
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setLoading(true);
      localStorage.removeItem('token');
      setUser(null);
      console.log('✅ Signed out successfully');
    } catch (error) {
       console.error('❌ Sign out error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    try {
      if (!user?.token) return;
      const userData = await getCurrentUser(user.token);
      setUser({
        ...userData.user,
        token: user.token
      });
    } catch (error) {
      console.error('❌ Refresh user error:', error);
      setError(error.message);
    }
  };

  const value = {
    user,
    loading,
    error,
    signInWithToken,
    signOut,
    refreshUser,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

export default AuthContext;
