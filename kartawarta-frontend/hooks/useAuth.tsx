import React, { useContext, createContext} from 'react';
import { useStorageState } from './useStorageState';
import { CARDS_API_ENDPOINT } from '@/constants/apiConfig';

const AuthContext = createContext<{
  login: (username: string, password: string) => Promise<boolean | void>;
  logout: () => void;
  session: string | null;
  isLoading: boolean;
} | null>(null);


export function useSession() {
  const value = useContext(AuthContext);
  if (!value) {
    throw new Error('useSession must be wrapped in a <SessionProvider />');
  }
  return value;
}

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // const [session, setSession] = useStorageState<string | null>('session', null);
  const [session, setSession] = React.useState<string | null>(null);

  const [isLoading, setIsLoading] = React.useState(false);

  const login = async (username: string, password: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`${CARDS_API_ENDPOINT}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      if (!response.ok) {
        throw new Error('Login failed');
      }
      const data = await response.json();
      setSession(data.token); // Save JWT token
      console.log('Login successful:', data.token);
      return true
    } catch (error) {
      console.error('Error during login:', error);
      return false
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setSession(null); // Clear the session
  };

  return (
    <AuthContext.Provider value={{ login, logout, session, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}