import { useState, useCallback, useRef } from "react";

export interface CodegenResult {
  questionsToday?: number;
  questionsLimit?: number;
}

export function useCodegen(token: string | null) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (
    prompt: string,
    language: string,
    onChunk?: (chunk: string) => void,
    onDone?: (result: CodegenResult) => void,
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsGenerating(true);
    setCode("");
    setError(null);

    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/codegen/generate", {
        method: "POST",
        headers,
        body: JSON.stringify({ prompt, language }),
        signal: abortControllerRef.current.signal,
      });

      if (res.status === 401) {
        setError("Your session has expired. Please log in again.");
        return;
      }

      if (res.status === 429) {
        const data = await res.json();
        setError(data.error || "Daily question limit reached. Come back tomorrow!");
        return;
      }

      if (!res.ok) {
        throw new Error(`Generation failed with status ${res.status}`);
      }

      if (!res.body) {
        throw new Error("No response body returned from server");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === "[DONE]") continue;

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
                setCode((prev) => {
                  const newCode = prev + data.content;
                  if (onChunk) onChunk(newCode);
                  return newCode;
                });
              }
            } catch (e) {
              console.warn("Failed to parse SSE chunk", dataStr);
            }
          }
        }
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        setError(err.message || "An unexpected error occurred");
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [token]);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  }, []);

  return { generate, stop, isGenerating, code, setCode, error };
}
