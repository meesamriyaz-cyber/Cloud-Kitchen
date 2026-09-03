import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const BootstrapCtx = createContext({
  status: null,
  loading: true,
  error: "",
  refreshBootstrap: async () => null,
  testDatabase: async () => null,
  initializeSetup: async () => null,
});

export function BootstrapProvider({ children }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshBootstrap = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/bootstrap/status`);
      setStatus(res.data);
      setError("");
      return res.data;
    } catch (err) {
      setError(err.response?.data?.detail || "Unable to check first-run setup status.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const testDatabase = useCallback(async (payload) => {
    const res = await axios.post(`${API}/bootstrap/test-database`, payload);
    return res.data;
  }, []);

  const initializeSetup = useCallback(async (payload) => {
    const res = await axios.post(`${API}/bootstrap/initialize`, payload);
    setStatus({
      mongo_url_configured: true,
      db_name: res.data.db_name,
      database: "connected",
      setup_complete: true,
      has_admin: true,
      needs_setup: false,
      firm: res.data.firm,
    });
    setError("");
    return res.data;
  }, []);

  useEffect(() => {
    refreshBootstrap();
  }, [refreshBootstrap]);

  const value = useMemo(() => ({
    status,
    loading,
    error,
    refreshBootstrap,
    testDatabase,
    initializeSetup,
  }), [status, loading, error, refreshBootstrap, testDatabase, initializeSetup]);

  return <BootstrapCtx.Provider value={value}>{children}</BootstrapCtx.Provider>;
}

export const useBootstrap = () => useContext(BootstrapCtx);
