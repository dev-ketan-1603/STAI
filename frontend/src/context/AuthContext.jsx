import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [eduData, setEduData] = useState(null);
  const [loading, setLoading] = useState(true);

  // On mount — restore session from saved token
  useEffect(() => {
    const token = localStorage.getItem('stai_token');
    if (!token) { setLoading(false); return; }
    api.get('/auth/me')
      .then(({ data }) => {
        setUser(data.user);
        return api.get('/profile/edu');
      })
      .then(({ data }) => { if (data.eduData) setEduData(data.eduData); })
      .catch(() => {
        localStorage.removeItem('stai_token');
        setUser(null);
        setEduData(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const _afterLogin = async (token, userData) => {
    localStorage.setItem('stai_token', token);
    setUser(userData);
    try {
      const edu = await api.get('/profile/edu');
      if (edu.data.eduData) setEduData(edu.data.eduData);
    } catch { /* no edu data yet */ }
    return userData;
  };

  const register = async (name, email, password) => {
    const { data } = await api.post('/auth/register', { name, email, password });
    localStorage.setItem('stai_token', data.token);
    setUser(data.user);
    return data.user;
  };

  const login = async (identifier, password) => {
    const { data } = await api.post('/auth/login', {
      identifier: identifier.trim(),
      email: identifier.trim(),
      password
    });
    return _afterLogin(data.token, data.user);
  };

  /**
   * Called after Google Sign-In returns a credential token.
   * Sends the credential to the backend for verification and account creation/lookup.
   */
  const loginWithGoogle = async (credential) => {
    const { data } = await api.post('/auth/google', { credential });
    return _afterLogin(data.token, data.user);
  };

  /**
   * Set session from an already-obtained token + user object.
   * Used by GoogleSignInButton after it directly calls the backend.
   */
  const setSession = async (token, userData) => {
    return _afterLogin(token, userData);
  };

  const logout = () => {
    localStorage.removeItem('stai_token');
    setUser(null);
    setEduData(null);
  };

  const saveEduData = async (formData) => {
    const { data } = await api.post('/profile/edu', formData);
    setEduData(data.eduData);
    setUser(u => u ? { ...u, hasCompletedDataCollection: true } : u);
    return data.eduData;
  };

  return (
    <AuthContext.Provider value={{ user, eduData, loading, login, loginWithGoogle, setSession, logout, register, saveEduData, setEduData }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
