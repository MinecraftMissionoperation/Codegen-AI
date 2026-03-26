import { useState, useEffect } from "react";

export interface HistoryItem {
  id: string;
  prompt: string;
  language: string;
  code: string;
  timestamp: number;
}

export function useHistory() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  // Load from local storage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("codegen_history");
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error("Failed to load history", e);
    }
  }, []);

  // Save to local storage whenever history changes
  useEffect(() => {
    try {
      localStorage.setItem("codegen_history", JSON.stringify(history));
    } catch (e) {
      console.error("Failed to save history", e);
    }
  }, [history]);

  const addHistoryItem = (item: HistoryItem) => {
    setHistory((prev) => [item, ...prev]);
  };

  const updateHistoryItemCode = (id: string, newCode: string) => {
    setHistory((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, code: newCode } : item
      )
    );
  };

  const deleteHistoryItem = (id: string) => {
    setHistory((prev) => prev.filter((item) => item.id !== id));
  };

  const clearHistory = () => {
    setHistory([]);
  };

  return {
    history,
    addHistoryItem,
    updateHistoryItemCode,
    deleteHistoryItem,
    clearHistory,
  };
}
