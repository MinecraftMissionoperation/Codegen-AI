import { useState, useCallback, useRef } from "react";

export function useCodegen() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  
  // Keep track of AbortController to allow cancelling
  const abortControllerRef = useRef<AbortController | null>(null);

  const generate = useCallback(async (
    prompt: string, 
    language: string, 
    onChunk?: (chunk: string) => void
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    setIsGenerating(true);
    setCode("");
    setError(null);

    try {
      const res = await fetch("/api/codegen/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, language }),
        signal: abortControllerRef.current.signal,
      });

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
        
        // Keep the last incomplete line in the buffer
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (!dataStr || dataStr === "[DONE]") continue;
            
            try {
              const data = JSON.parse(dataStr);
              if (data.done) {
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
  }, []);

  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsGenerating(false);
    }
  }, []);

  return { generate, stop, isGenerating, code, setCode, error };
}
