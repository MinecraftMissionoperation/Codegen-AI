import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export interface ChatResult {
  questionsToday?: number;
  questionsLimit?: number;
}

export function useChat(token: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(async (
    content: string,
    onDone?: (result: ChatResult) => void,
  ) => {
    if (!content.trim() || isStreaming) return;

    setError(null);

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content,
    };

    const assistantId = (Date.now() + 1).toString();
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      streaming: true,
    };

    setMessages((prev) => {
      // Build history from previous messages (excluding any currently streaming ones)
      return [...prev, userMsg, assistantMsg];
    });

    setIsStreaming(true);
    abortRef.current = new AbortController();

    try {
      // Build history (exclude the new user message and the empty assistant placeholder)
      const history = messages.map(m => ({ role: m.role, content: m.content }));

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/chat/message", {
        method: "POST",
        headers,
        body: JSON.stringify({ message: content, history }),
        signal: abortRef.current.signal,
      });

      if (res.status === 401) {
        setError("Your session has expired. Please log in again.");
        setMessages((prev) => prev.filter(m => m.id !== assistantId));
        return;
      }

      if (res.status === 429) {
        const data = await res.json();
        setError(data.error || "Daily question limit reached. Come back tomorrow!");
        setMessages((prev) => prev.filter(m => m.id !== assistantId));
        return;
      }

      if (!res.ok || !res.body) {
        throw new Error("Chat request failed");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr) continue;

            try {
              const data = JSON.parse(dataStr);
              if (data.done) {
                if (onDone) onDone({ questionsToday: data.questionsToday, questionsLimit: data.questionsLimit });
                break;
              }
              if (data.error) {
                setError(data.error);
                break;
              }
              if (data.content) {
                fullContent += data.content;
                setMessages((prev) =>
                  prev.map(m =>
                    m.id === assistantId ? { ...m, content: fullContent } : m
                  )
                );
              }
            } catch {}
          }
        }
      }

      // Mark as no longer streaming
      setMessages((prev) =>
        prev.map(m =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      );
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "Something went wrong");
        setMessages((prev) => prev.filter(m => m.id !== assistantId));
      }
    } finally {
      setIsStreaming(false);
      abortRef.current = null;
    }
  }, [token, messages, isStreaming]);

  const stop = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setIsStreaming(false);
      // Mark last message as done
      setMessages((prev) =>
        prev.map(m => m.streaming ? { ...m, streaming: false } : m)
      );
    }
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return { messages, sendMessage, stop, isStreaming, error, setError, clearMessages };
}
