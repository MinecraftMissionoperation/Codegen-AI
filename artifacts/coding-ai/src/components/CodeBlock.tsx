import React, { useState, useEffect, useRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Check, Copy, TerminalSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

interface CodeBlockProps {
  code: string;
  language: string;
  isGenerating?: boolean;
  className?: string;
}

export function CodeBlock({ code, language, isGenerating, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom while generating
  useEffect(() => {
    if (isGenerating && containerRef.current) {
      const { scrollHeight, clientHeight } = containerRef.current;
      containerRef.current.scrollTo({
        top: scrollHeight - clientHeight,
        behavior: "smooth"
      });
    }
  }, [code, isGenerating]);

  const handleCopy = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("flex flex-col rounded-xl overflow-hidden glass-panel", className)}>
      {/* Mac-like Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-zinc-900/80 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5 mr-4">
            <div className="w-3 h-3 rounded-full bg-red-500/80" />
            <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
            <div className="w-3 h-3 rounded-full bg-green-500/80" />
          </div>
          <TerminalSquare className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {language || "text"}
          </span>
        </div>
        
        <button
          onClick={handleCopy}
          disabled={!code}
          className="flex items-center justify-center w-8 h-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Copy code"
        >
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="check"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Check className="w-4 h-4 text-primary" />
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Copy className="w-4 h-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </button>
      </div>

      {/* Code Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto bg-[#0d1117] p-4 relative font-mono text-sm"
      >
        {code ? (
          <div className="relative">
            <SyntaxHighlighter
              language={language.toLowerCase()}
              style={vscDarkPlus}
              customStyle={{
                margin: 0,
                padding: 0,
                background: "transparent",
                fontSize: "14px",
                lineHeight: "1.5",
              }}
              codeTagProps={{
                style: { fontFamily: "var(--font-mono)" }
              }}
            >
              {code}
            </SyntaxHighlighter>
            {isGenerating && <span className="cursor-blink" />}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-zinc-600 italic">
            {isGenerating ? (
              <div className="flex items-center gap-2">
                <span className="cursor-blink mr-2" />
                Initializing thinking process...
              </div>
            ) : (
              "Code output will appear here"
            )}
          </div>
        )}
      </div>
    </div>
  );
}
