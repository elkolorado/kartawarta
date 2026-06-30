import React, { useContext, createContext, useEffect } from 'react';
import { CARDS_API_ENDPOINT } from '@/constants/apiConfig';
import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

type StoredAuthState = {
  accessToken: string;
  refreshToken: string | null;
};

type AuthContextValue = {
  login: (username: string, password: string) => Promise<boolean>;
  loginWithGoogle: (googleToken: string) => Promise<boolean>;
  logout: () => void;
  session: string | null;
  isLoading: boolean;
  fetchWithAuth: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  bulkUpdateCollection: (action: 'add' | 'remove', items: Array<{ card_id?: number; card_market_id?: number; quantity?: number; quantity_foil?: number; label_quantities?: Record<number, number>; label_foil_quantities?: Record<number, number> }>, labelIds?: number[], labelQuantities?: Record<number, number>, labelFoilQuantities?: Record<number, number>) => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const AUTH_STATE_KEY = 'kartawarta_auth_state_v2';
const LEGACY_TOKEN_KEY = 'kartawarta_token_v1';
const PENDING_AUTH_PATH_KEY = 'kartawarta_pending_auth_path_v1';
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);

  if (typeof globalThis.atob === 'function') {
    return globalThis.atob(padded);
  }

  const buffer = (globalThis as any).Buffer;
  if (buffer) {
    return buffer.from(padded, 'base64').toString('binary');
  }

  throw new Error('No base64 decoder available');
}

function readJwtExpiry(token: string): number | null {
  try {
    const payload = token.split('.')[1];
    if (!payload) return null;
    const decoded = JSON.parse(decodeBase64Url(payload));
    return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isJwtExpired(token: string) {
  const expiryMs = readJwtExpiry(token);
  if (!expiryMs) return true;
  return expiryMs <= Date.now() + REFRESH_THRESHOLD_MS;
}

function getStoredAuthState(rawValue: string | null): StoredAuthState | null {
  if (!rawValue) return null;

  try {
    const parsed = JSON.parse(rawValue) as Partial<StoredAuthState>;
    if (parsed.accessToken) {
      return {
        accessToken: parsed.accessToken,
        refreshToken: parsed.refreshToken ?? null,
      };
    }
  } catch {
    if (typeof rawValue === 'string') {
      return {
        accessToken: rawValue,
        refreshToken: null,
      };
    }
  }

  return null;
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = React.useState<string | null>(null);
  const [refreshToken, setRefreshToken] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  async function persistAuthState(nextState: StoredAuthState | null) {
    try {
      if (Platform.OS === 'web') {
        if (nextState) {
          localStorage.setItem(AUTH_STATE_KEY, JSON.stringify(nextState));
          localStorage.setItem(LEGACY_TOKEN_KEY, nextState.accessToken);
        } else {
          localStorage.removeItem(AUTH_STATE_KEY);
          localStorage.removeItem(LEGACY_TOKEN_KEY);
        }
      } else {
        if (nextState) {
          await SecureStore.setItemAsync(AUTH_STATE_KEY, JSON.stringify(nextState));
          await SecureStore.setItemAsync(LEGACY_TOKEN_KEY, nextState.accessToken);
        } else {
          await SecureStore.deleteItemAsync(AUTH_STATE_KEY);
          await SecureStore.deleteItemAsync(LEGACY_TOKEN_KEY);
        }
      }
    } catch (error) {
      console.warn('Token persist error', error);
    }
  }

  async function loadAuthState() {
    try {
      let storedState: string | null = null;
      if (Platform.OS === 'web') {
        storedState = localStorage.getItem(AUTH_STATE_KEY) ?? localStorage.getItem(LEGACY_TOKEN_KEY);
      } else {
        storedState = (await SecureStore.getItemAsync(AUTH_STATE_KEY)) ?? (await SecureStore.getItemAsync(LEGACY_TOKEN_KEY));
      }

      return getStoredAuthState(storedState);
    } catch (error) {
      console.warn('Failed to read session', error);
      return null;
    }
  }

  async function applyAuthState(nextState: StoredAuthState | null) {
    setSession(nextState?.accessToken ?? null);
    setRefreshToken(nextState?.refreshToken ?? null);
    await persistAuthState(nextState);
  }

  async function requestTokenRefresh(refreshTokenValue: string): Promise<StoredAuthState | null> {
    try {
      const response = await fetch(`${CARDS_API_ENDPOINT}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshTokenValue }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      const accessToken = data.access_token ?? data.token;
      const nextRefreshToken = data.refresh_token ?? refreshTokenValue;

      if (!accessToken) {
        throw new Error('Refresh response did not include an access token');
      }

      return {
        accessToken,
        refreshToken: nextRefreshToken,
      };
    } catch (error) {
      console.error('Auth refresh error:', error);
      return null;
    }
  }

  async function refreshSession(refreshTokenOverride?: string) {
    const tokenToUse = refreshTokenOverride ?? refreshToken;
    if (!tokenToUse) return null;

    const refreshed = await requestTokenRefresh(tokenToUse);
    if (!refreshed) {
      await clearSession();
      return null;
    }

    await applyAuthState(refreshed);
    return refreshed.accessToken;
  }

  async function clearSession() {
    setSession(null);
    setRefreshToken(null);
    await persistAuthState(null);
  }

  // restore token on mount
  useEffect(() => {
    let mounted = true;

    (async () => {
      setIsLoading(true);
      try {
        const stored = await loadAuthState();
        if (!mounted) return;

        if (!stored?.accessToken) {
          return;
        }

        if (isJwtExpired(stored.accessToken) && stored.refreshToken) {
          const refreshedAccessToken = await refreshSession(stored.refreshToken);
          if (!mounted) return;
          if (refreshedAccessToken) {
            return;
          }
        }

        if (isJwtExpired(stored.accessToken) && !stored.refreshToken) {
          await clearSession();
          return;
        }

        setSession(stored.accessToken);
        setRefreshToken(stored.refreshToken);
      } catch (error) {
        console.warn('Failed to restore session', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const loginWithGoogle = async (googleToken: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${CARDS_API_ENDPOINT}/auth/login/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: googleToken }),
      });

      if (!response.ok) throw new Error('Google Login failed');

      const data = await response.json();
      const nextState: StoredAuthState = {
        accessToken: data.access_token ?? data.token,
        refreshToken: data.refresh_token ?? null,
      };

      if (!nextState.accessToken) {
        throw new Error('Login response did not include an access token');
      }

      await applyAuthState(nextState);
      return true;
    } catch (error) {
      console.error('Google Auth Error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (username: string, password: string) => { /* ... existing code ... */ return true; };

  const logout = () => {
    void clearSession();
  };

  const setPendingAuthPath = (path: string) => {
    if (Platform.OS !== 'web' || !path || path === '/login') return;

    try {
      sessionStorage.setItem(PENDING_AUTH_PATH_KEY, path);
    } catch (error) {
      console.warn('Failed to save pending auth path', error);
    }
  };

  const takePendingAuthPath = () => {
    if (Platform.OS !== 'web') return null;

    try {
      const pendingPath = sessionStorage.getItem(PENDING_AUTH_PATH_KEY);
      sessionStorage.removeItem(PENDING_AUTH_PATH_KEY);
      return pendingPath && pendingPath !== '/login' ? pendingPath : null;
    } catch (error) {
      console.warn('Failed to read pending auth path', error);
      return null;
    }
  };

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    if (!session && !isLoading && window.location.pathname !== '/login') {
      setPendingAuthPath(window.location.pathname + window.location.search + window.location.hash);
      return;
    }

    if (session && window.location.pathname === '/login') {
      const pendingPath = takePendingAuthPath();
      if (pendingPath) {
        window.history.replaceState(window.history.state, '', pendingPath);
        window.dispatchEvent(new Event('popstate'));
      }
    }
  }, [session, isLoading]);

  const fetchWithAuth = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers ?? {});
    if (session) {
      headers.set('Authorization', `Bearer ${session}`);
    }

    const response = await fetch(input, {
      ...init,
      headers,
    });

    if (response.status !== 401) {
      return response;
    }

    const refreshedAccessToken = await refreshSession();
    if (!refreshedAccessToken) {
      return response;
    }

    const retryHeaders = new Headers(init.headers ?? {});
    retryHeaders.set('Authorization', `Bearer ${refreshedAccessToken}`);

    return fetch(input, {
      ...init,
      headers: retryHeaders,
    });
  };

  const bulkUpdateCollection = async (action: 'add' | 'remove', items: Array<{ card_id?: number; card_market_id?: number; quantity?: number; quantity_foil?: number; label_quantities?: Record<number, number>; label_foil_quantities?: Record<number, number> }>, labelIds: number[] = [], labelQuantities: Record<number, number> = {}, labelFoilQuantities: Record<number, number> = {}) => {
    try {
      const response = await fetchWithAuth(`${CARDS_API_ENDPOINT}/collection/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, items, label_ids: labelIds, label_quantities: labelQuantities, label_foil_quantities: labelFoilQuantities }),
      });

      if (!response.ok) {
        throw new Error(`Bulk collection ${action} failed`);
      }

      return true;
    } catch (error) {
      console.error(`Bulk collection ${action} error:`, error);
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{ login, loginWithGoogle, logout, session, isLoading, fetchWithAuth, bulkUpdateCollection }}>
      {children}
    </AuthContext.Provider>
  );
};

export function useSession() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useSession must be wrapped in a <SessionProvider />');
  return value;
}