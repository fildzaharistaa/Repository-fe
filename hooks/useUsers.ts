'use client';

import { useState, useCallback } from 'react';
import { apiClient } from '@/lib/api/client';
import type { User, PaginatedResponse } from '@/types';

export function useUsers() {
  const [users, setUsers] = useState<PaginatedResponse<User> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async (page = 1, limit = 10) => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiClient.getUsers(page, limit);
      setUsers(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }, []);

  const createUser = useCallback(async (userData: {
    email: string;
    password: string;
    name: string;
    role_id?: string;
  }) => {
    try {
      const newUser = await apiClient.createUser(userData);
      return newUser;
    } catch (err) {
      throw err;
    }
  }, []);

  const updateUser = useCallback(async (
    id: string,
    userData: Partial<{
      name: string;
      email: string;
      password: string;
      role_id: string;
    }>
  ) => {
    try {
      const updatedUser = await apiClient.updateUser(id, userData);
      return updatedUser;
    } catch (err) {
      throw err;
    }
  }, []);

  const deleteUser = useCallback(async (id: string) => {
    try {
      await apiClient.deleteUser(id);
    } catch (err) {
      throw err;
    }
  }, []);

  return {
    users,
    loading,
    error,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  };
}


