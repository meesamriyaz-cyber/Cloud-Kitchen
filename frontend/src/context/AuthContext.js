import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const TOKEN_KEY = "restaurant_app_token";
const DEMO_ORIGINAL_SESSION_KEY = "cloud_kitchen_demo_original_session";
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));

  const applyAuthHeader = useCallback((t) => {
    if (t) axios.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    else delete axios.defaults.headers.common["Authorization"];
  }, []);

  const checkAuth = useCallback(async () => {
    try {
      const t = localStorage.getItem(TOKEN_KEY);
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

  const applySession = useCallback((nextToken, nextUser) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    setToken(nextToken);
    applyAuthHeader(nextToken);
    setUser(nextUser);
  }, [applyAuthHeader]);

  const login = async (email, password) => {
    const res = await axios.post(`${API}/auth/login`, { email, password });
    applySession(res.data.token, res.data.user);
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await axios.post(`${API}/auth/register`, { name, email, password });
    applySession(res.data.token, res.data.user);
    return res.data.user;
  };

  const demoAdminLogin = async () => {
    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (currentToken) {
      sessionStorage.setItem(
        DEMO_ORIGINAL_SESSION_KEY,
        JSON.stringify({ token: currentToken, user })
      );
    }

    const res = await axios.post(`${API}/demo/admin-login`);
    applySession(res.data.token, res.data.user);
    return res.data.user;
  };

  const switchDemoRole = async (role) => {
    if (role === "customer") {
      const saved = sessionStorage.getItem(DEMO_ORIGINAL_SESSION_KEY);
      if (!saved) {
        throw new Error("Original Demo customer session is unavailable.");
      }

      const session = JSON.parse(saved);
      applySession(session.token, session.user);
      sessionStorage.removeItem(DEMO_ORIGINAL_SESSION_KEY);
      return session.user;
    }

    const currentToken = localStorage.getItem(TOKEN_KEY);
    if (currentToken && !sessionStorage.getItem(DEMO_ORIGINAL_SESSION_KEY)) {
      sessionStorage.setItem(
        DEMO_ORIGINAL_SESSION_KEY,
        JSON.stringify({ token: currentToken, user })
      );
    }

    const res = await axios.post(`${API}/demo/switch-role`, { role });
    applySession(res.data.token, res.data.user);
    return res.data.user;
  };

  const logout = async () => {
    try { await axios.post(`${API}/auth/logout`, {}, { withCredentials: true }); } catch {}
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(DEMO_ORIGINAL_SESSION_KEY);
    applyAuthHeader(null);
    setToken(null);
    setUser(null);
  };

  return (
<AuthCtx.Provider
  value={{
    user,
    loading,
    token,
    login,
    register,
    demoAdminLogin,
    switchDemoRole,
    logout,
    checkAuth,
    applySession,
  }}
>      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
