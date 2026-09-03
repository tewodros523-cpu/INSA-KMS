'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { useRouter } from 'next/navigation';
import { UserRole } from '@/src/lib/auth';

export interface AuthUser {
  id?: string;
  username: string;
  email: string;
  fullName: string;
  department?: string;
  roles: UserRole[];
}

interface AuthContextValue {
  user: AuthUser | null;
  roles: UserRole[];
  isAuthenticated: boolean;
  isLoading: boolean;
  logout: () => void;
  refetch: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  roles: [],
  isAuthenticated: false,
  isLoading: true,
  logout: () => {},
  refetch: () => {},
});

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}

function getStoredToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('kms_access_token');
}

function getStoredRefreshToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('kms_refresh_token');
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api/v1';

const KEYCLOAK_URL =
  process.env.NEXT_PUBLIC_KEYCLOAK_URL || 'http://localhost:8080';
const REALM = process.env.NEXT_PUBLIC_KEYCLOAK_REALM || 'kms-realm';
const CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID || 'kms-frontend-client';

/**
 * Attempt to silently refresh the access token using the stored refresh token.
 * Returns the new access token on success, or null on failure.
 */
async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(
      `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: CLIENT_ID,
          refresh_token: refreshToken,
        }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.access_token) {
      sessionStorage.setItem('kms_access_token', data.access_token);
      if (data.refresh_token) {
        sessionStorage.setItem('kms_refresh_token', data.refresh_token);
      }
      return data.access_token;
    }
  } catch {
    // network error etc. — give up
  }
  return null;
}

function isJwtExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (!payload.exp) return false;
    return Date.now() >= payload.exp * 1000 - 10000;
  } catch {
    return true;
  }
}

/**
 * Try to get a valid token, refreshing silently if the current one is expired.
 * Returns null if no valid token can be obtained.
 */
async function getValidToken(): Promise<string | null> {
  const token = getStoredToken();
  if (token && !isJwtExpired(token)) {
    return token;
  }

  // Token missing or expired — try refresh
  const refreshed = await tryRefreshToken();
  if (refreshed) return refreshed;

  return null;
}

const API_AUTH_ERROR_KEY = '__kms_auth_error_ts';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isMounted = useRef(true);

  const fetchUser = useCallback(async () => {
    const token = await getValidToken();
    if (!token) {
      if (isMounted.current) setIsLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        // Current token is rejected — try one silent refresh before giving up
        const refreshed = await tryRefreshToken();
        if (refreshed) {
          const retry = await fetch(`${API_BASE_URL}/users/me`, {
            headers: { Authorization: `Bearer ${refreshed}` },
          });
          if (retry.ok) {
            const data = await retry.json();
            if (isMounted.current) {
              const rawName = data.fullName || data.username;
              const formattedName = rawName.replace(/Jane\s*(Doe)?\s*/gi, '').trim() || 'Contributor';
              setUser({
                id: data.id,
                username: data.username,
                email: data.email,
                fullName: formattedName,
                department: data.department,
                roles: (data.roles || []) as UserRole[],
              });
              setIsLoading(false);
            }
            return;
          }
        }
        // Truly unauthenticated — clear state, let AppShell handle the redirect
        sessionStorage.removeItem('kms_access_token');
        sessionStorage.removeItem('kms_refresh_token');
        document.cookie = 'kms_auth_present=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
        if (isMounted.current) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      if (!res.ok) {
        throw new Error(`Failed to fetch user profile: ${res.status}`);
      }

      const data = await res.json();
      if (isMounted.current) {
        const rawName = data.fullName || data.username;
        const formattedName = rawName.replace(/Jane\s*(Doe)?\s*/gi, '').trim() || 'Contributor';
        setUser({
          id: data.id,
          username: data.username,
          email: data.email,
          fullName: formattedName,
          department: data.department,
          roles: (data.roles || []) as UserRole[],
        });
      }
    } catch (err) {
      console.error('[AuthContext] fetchUser error:', err);
      if (isMounted.current) {
        setUser(null);
      }
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    isMounted.current = true;
    fetchUser();
    return () => {
      isMounted.current = false;
    };
  }, [fetchUser]);

  const logout = useCallback(() => {
    const refreshToken = getStoredRefreshToken();
    
    // Clear local state immediately
    sessionStorage.removeItem('kms_access_token');
    sessionStorage.removeItem('kms_refresh_token');
    setUser(null);
    document.cookie = 'kms_auth_present=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    
    // Attempt to revoke the refresh token server-side via Keycloak logout endpoint
    if (refreshToken) {
      fetch(
        `${KEYCLOAK_URL}/realms/${REALM}/protocol/openid-connect/logout`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: CLIENT_ID,
            refresh_token: refreshToken,
          }),
        }
      ).catch(() => {
        // Non-critical — local state is already cleared
      });
    }
    
    window.location.href = '/login';
  }, []);

  // --- Redirect to /login when not authenticated, with loop guard ---
  useEffect(() => {
    if (isLoading || user !== null) return;

    // Only redirect once per "session failed" event to avoid infinite loops.
    // If we already redirected less than 2 seconds ago, stop.
    const lastRedirect = sessionStorage.getItem(API_AUTH_ERROR_KEY);
    const now = Date.now();
    if (lastRedirect && now - Number(lastRedirect) < 2000) {
      // Too many redirects — clear the guard and stop the loop
      sessionStorage.removeItem(API_AUTH_ERROR_KEY);
      return;
    }
    sessionStorage.setItem(API_AUTH_ERROR_KEY, String(now));
    router.replace('/login');
  }, [isLoading, user, router]);

  const value: AuthContextValue = {
    user,
    roles: user?.roles ?? [],
    isAuthenticated: user !== null,
    isLoading,
    logout,
    refetch: fetchUser,
  };

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}
