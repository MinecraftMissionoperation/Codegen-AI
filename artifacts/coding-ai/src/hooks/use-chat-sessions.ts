import { useState, useEffect } from "react";
import { ChatMessage } from "./use-chat";

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  timestamp: number;
}

const STORAGE_KEY = "codegen_chat_sessions";

export function useChatSessions() {
  const [sessions, setSessions] = useState<ChatSession[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setSessions(JSON.parse(stored));
    } catch {}
  }, []);

  const persist = (updated: ChatSession[]) => {
    setSessions(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const saveSession = (messages: ChatMessage[]) => {
    if (messages.length === 0) return;
    const firstUser = messages.find(m => m.role === "user");
    const title = firstUser?.content.slice(0, 80) || "Conversation";
    const session: ChatSession = {
      id: Date.now().toString(),
      title,
      messages: messages.map(m => ({ ...m, streaming: false })),
      timestamp: Date.now(),
    };
    persist([session, ...sessions]);
  };

  const deleteSession = (id: string) => {
    persist(sessions.filter(s => s.id !== id));
  };

  const clearSessions = () => {
    persist([]);
  };

  return { sessions, saveSession, deleteSession, clearSessions };
}
