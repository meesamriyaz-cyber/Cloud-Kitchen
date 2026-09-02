import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { DEFAULT_FIRM, normalizeFirm } from "@/constants/firm";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
const FirmCtx = createContext({
  firm: DEFAULT_FIRM,
  loading: true,
  refreshFirm: async () => DEFAULT_FIRM,
});

export function FirmProvider({ children }) {
  const [firm, setFirm] = useState(DEFAULT_FIRM);
  const [loading, setLoading] = useState(true);

  const refreshFirm = useCallback(async () => {
    try {
      const res = await axios.get(`${API}/firm`);
      const nextFirm = normalizeFirm(res.data);
      setFirm(nextFirm);
      return nextFirm;
    } catch {
      setFirm(DEFAULT_FIRM);
      return DEFAULT_FIRM;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshFirm();
  }, [refreshFirm]);

  useEffect(() => {
    document.title = firm.name || DEFAULT_FIRM.name;
  }, [firm.name]);

  const value = useMemo(() => ({ firm, loading, refreshFirm }), [firm, loading, refreshFirm]);

  return <FirmCtx.Provider value={value}>{children}</FirmCtx.Provider>;
}

export const useFirm = () => useContext(FirmCtx);
