'use client';

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { User } from '@/types';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const savedUser = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));

        
        // Verify token is still valid
        apiClient.getProfile()
          .then(setUser)
          .catch(() => {
            if (typeof window !== 'undefined') {
              localStorage.removeItem('token');
              localStorage.removeItem('user');
            }
            setUser(null);
          })
          .finally(() => setLoading(false));
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await apiClient.login(email, password);
    if (typeof window !== 'undefined') {
      localStorage.setItem('token', response.access_token);
      localStorage.setItem('user', JSON.stringify(response.user));
    }
    setUser(response.user);
    return response;
  }, []);

  const logout = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('active_role_id');
    }
    setUser(null);
  }, []);

  return { user, loading, login, logout };
}


