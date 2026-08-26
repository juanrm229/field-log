import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { getNotebooks } from "../api";

const NotebooksContext = createContext({ notebooks: [], loading: true, refresh: () => {} });

export const NotebooksProvider = ({ children }) => {
  const [notebooks, setNotebooks] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await getNotebooks();
      setNotebooks(data);
    } catch (e) {
      console.error("Failed to load notebooks", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <NotebooksContext.Provider value={{ notebooks, loading, refresh }}>
      {children}
    </NotebooksContext.Provider>
  );
};

export const useNotebooks = () => useContext(NotebooksContext);
