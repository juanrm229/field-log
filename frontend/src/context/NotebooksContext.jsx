import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getNotebooks } from "../api";

const NotebooksContext = createContext({ notebooks: [], loading: true, error: false, refresh: () => {} });

export const NotebooksProvider = ({ children }) => {
  const [notebooks, setNotebooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const data = await getNotebooks();
      setNotebooks(data);
    } catch (e) {
      // Swallowing this used to leave the desk empty, which reads as "this
      // writer has published nothing" rather than "the request failed".
      console.error("Failed to load notebooks", e);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <NotebooksContext.Provider value={{ notebooks, loading, error, refresh }}>
      {children}
    </NotebooksContext.Provider>
  );
};

export const useNotebooks = () => useContext(NotebooksContext);
