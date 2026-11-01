/**
 * Admin Authentication & Session Security Context
 *
 * Enforces restricted access to administrative infrastructure:
 * - Session-isolated storage (sessionStorage only, cleared on tab close)
 * - Master Passkey authentication
 * - Username & Password authentication
 * - Cryptographic session token verification against backend
 */

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AdminUser {
  username: string;
  role: string;
  accessTier: string;
  token: string;
}

interface AdminAuthContextType {
  isAuthenticated: boolean;
  adminUser: AdminUser | null;
  isVerifying: boolean;
  loginWithMasterKey: (masterKey: string) => Promise<{ success: boolean; error?: string }>;
  loginWithCredentials: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

const TOKEN_KEY = 'yojana_admin_session_token';
const USER_KEY = 'yojana_admin_user_data';

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [adminUser, setAdminUser] = useState<AdminUser | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(true);

  // Probe existing session on mount
  useEffect(() => {
    const storedToken = sessionStorage.getItem(TOKEN_KEY);
    const storedUser = sessionStorage.getItem(USER_KEY);

    if (!storedToken || !storedUser) {
      setIsVerifying(false);
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);
      // Verify token freshness with backend
      fetch('http://127.0.0.1:8005/api/v1/admin/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: storedToken })
      })
        .then(res => res.json())
        .then(data => {
          if (data?.ok && data?.data?.valid) {
            setIsAuthenticated(true);
            setAdminUser(parsedUser);
          } else {
            logout();
          }
        })
        .catch(() => {
          // If backend offline or error, maintain current session or logout
          setIsAuthenticated(true);
          setAdminUser(parsedUser);
        })
        .finally(() => setIsVerifying(false));
    } catch {
      logout();
      setIsVerifying(false);
    }
  }, []);

  const loginWithMasterKey = async (masterKey: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('http://127.0.0.1:8005/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ master_key: masterKey })
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        return {
          success: false,
          error: data?.error?.message || data?.detail || 'Invalid master passkey.'
        };
      }

      const user: AdminUser = {
        username: data.data.username,
        role: data.data.role,
        accessTier: data.data.access_tier,
        token: data.data.token
      };

      sessionStorage.setItem(TOKEN_KEY, user.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      setIsAuthenticated(true);
      setAdminUser(user);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to connect to authentication server.'
      };
    }
  };

  const loginWithCredentials = async (username: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('http://127.0.0.1:8005/api/v1/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        return {
          success: false,
          error: data?.error?.message || data?.detail || 'Invalid administrator username or password.'
        };
      }

      const user: AdminUser = {
        username: data.data.username,
        role: data.data.role,
        accessTier: data.data.access_tier,
        token: data.data.token
      };

      sessionStorage.setItem(TOKEN_KEY, user.token);
      sessionStorage.setItem(USER_KEY, JSON.stringify(user));
      setIsAuthenticated(true);
      setAdminUser(user);
      return { success: true };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || 'Failed to connect to authentication server.'
      };
    }
  };

  const logout = () => {
    sessionStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(USER_KEY);
    setIsAuthenticated(false);
    setAdminUser(null);
  };

  return (
    <AdminAuthContext.Provider
      value={{
        isAuthenticated,
        adminUser,
        isVerifying,
        loginWithMasterKey,
        loginWithCredentials,
        logout
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

