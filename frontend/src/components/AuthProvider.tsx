import { useState, ReactNode, useCallback } from 'react';
import { AuthContext } from '../hooks/useAuth';
import { User } from '../types';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('flyai_token'));
  const [user, setUser] = useState<User | null>(() => {
    const stored = localStorage.getItem('flyai_user');
    return stored ? (JSON.parse(stored) as User) : null;
  });

  const login = useCallback((t: string, u: User) => {
    localStorage.setItem('flyai_token', t);
    localStorage.setItem('flyai_user', JSON.stringify(u));
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('flyai_token');
    localStorage.removeItem('flyai_user');
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isAuthenticated: !!token }}>
      {children}
    </AuthContext.Provider>
  );
}
