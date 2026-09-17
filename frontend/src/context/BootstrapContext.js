import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const APP_MODE = process.env.REACT_APP_APP_MODE || "production";
const IS_DEMO = APP_MODE === "demo";
const BootstrapCtx = createContext({
  status: null,
  loading: true,
  error: "",
  refreshBootstrap: async () => null,
  initializeSetup: async () => null,
});

export function BootstrapProvider({ children }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refreshBootstrap = useCallback(async () => {
  setLoading(true);

  try {
    const endpoint = IS_DEMO
      ? `${API}/demo/status`
      : `${API}/bootstrap/status`;

    const res = await axios.get(endpoint);

    setStatus(res.data);
    setError("");

    return res.data;
  } catch (err) {
    setError(
      err.response?.data?.detail ||
      "Unable to check first-run setup status."
    );
    return null;
  } finally {
    setLoading(false);
  }
}, []);

  const initializeSetup = useCallback(async (payload) => {
  const endpoint = IS_DEMO
    ? `${API}/demo/initialize`
    : `${API}/bootstrap/initialize`;

  const res = IS_DEMO
    ? await axios.post(endpoint)
    : await axios.post(endpoint, payload);

  setStatus({
    ...res.data,
    setup_complete: true,
    has_admin: true,
    needs_setup: false,
    database: "connected",
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
    initializeSetup,
  }), [status, loading, error, refreshBootstrap, initializeSetup]);

  return <BootstrapCtx.Provider value={value}>{children}</BootstrapCtx.Provider>;
}

export const useBootstrap = () => useContext(BootstrapCtx);
