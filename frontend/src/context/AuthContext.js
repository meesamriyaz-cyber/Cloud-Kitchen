import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem("mck_token"));

  const applyAuthHeader = useCallback((t) => {
    if (t) axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    else delete axios.defaults.headers.common["Authorization"];
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const t = localStorage.getItem("mck_token");
      applyAuthHeader(t);
      const res = await axios.get(`${API}/auth/me`, { withCredentials: true });
      setUser(res.data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, [applyAuthHeader]);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    localStorage.setItem("mck_token", res.data.token);
    setToken(res.data.token);
    applyAuthHeader(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await axios.post(`${API}/auth/register`, { name, email, password });
    localStorage.setItem("mck_token", res.data.token);
    setToken(res.data.token);
    applyAuthHeader(res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try { await axios.post(`${API}/auth/logout`, {}, { withCredentials: true }); } catch {}
    localStorage.removeItem("mck_token");
    applyAuthHeader(null);
    setToken(null);
    setUser(null);
  };

  return (
    <AuthCtx.Provider value={{ user, loading, token, login, register, logout, checkAuth }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
