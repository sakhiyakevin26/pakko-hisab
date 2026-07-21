import React, { createContext, useContext, useState, useEffect } from 'react';
import { mockBackend } from '../lib/mockBackend';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check if user is already logged in via localStorage session mock
    const savedUser = localStorage.getItem('money_tracker_session');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (username, password) => {
    try {
      const response = await mockBackend.login(username, password);
      setUser(response.user);
      localStorage.setItem('money_tracker_session', JSON.stringify(response.user));
      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const loginWithGoogle = async (credential) => {
    try {
      const response = await mockBackend.loginWithGoogle(credential);
      setUser(response.user);
      localStorage.setItem('money_tracker_session', JSON.stringify(response.user));
      return { success: true, user: response.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('money_tracker_session');
  };

  const value = {
    user,
    login,
    loginWithGoogle,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
