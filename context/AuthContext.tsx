'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import type { User } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<any>;
  logout: () => void;
  isAdmin: boolean;
  isDosen: boolean;
  isTendik: boolean;
  canCreateFolder: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { user, loading, login, logout } = useAuth();
  const roleName = (typeof user?.role === 'object' ? user?.role?.name : user?.role)?.toLowerCase();
  const isAdmin = roleName === 'admin' || roleName === 'super admin' || roleName === 'superadmin';
  const isDosen = roleName === 'dosen';
  const isTendik = roleName === 'tendik';
  // Dosen and Tendik cannot create folders — only admin and WD roles can
  const canCreateFolder = !isDosen && !isTendik && !!user;

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin, isDosen, isTendik, canCreateFolder }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
