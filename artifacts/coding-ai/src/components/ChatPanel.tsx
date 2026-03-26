import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, StopCircle, Trash2, Bot, User, Sparkles, Copy, Check } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useChat, ChatMessage } from "@/hooks/use-chat";
import { UserInfo } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

interface ChatPanelProps {
  token: string | null;
  user: UserInfo;
  onUserUpdate: (info: Partial<UserInfo>) => void;
}

function MarkdownContent({ content, streaming }: { content: string; streaming?: boolean }) {
  return (
    <div className="prose prose-sm prose-invert max-w-none
      prose-p:my-1.5 prose-p:leading-relaxed
      prose-headings:text-foreground prose-headings:font-semibold
      prose-h1:text-lg prose-h2:text-base prose-h3:text-sm
      prose-strong:text-foreground prose-strong:font-semibold
      prose-em:text-zinc-300
      prose-ul:my-1.5 prose-ul:pl-4 prose-ol:my-1.5 prose-ol:pl-4
      prose-li:my-0.5 prose-li:leading-relaxed
      prose-code:text-emerald-400 prose-code:bg-zinc-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:before:content-none prose-code:after:content-none
      prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-700 prose-pre:rounded-xl prose-pre:my-2 prose-pre:p-3 prose-pre:overflow-x-auto
      prose-pre:prose-code:bg-transparent prose-pre:prose-code:p-0 prose-pre:prose-code:text-zinc-200
      prose-blockquote:border-l-2 prose-blockquote:border-primary/40 prose-blockquote:pl-3 prose-blockquote:text-zinc-400 prose-blockquote:not-italic prose-blockquote:my-2
      prose-table:text-sm prose-table:my-2
      prose-th:text-zinc-300 prose-th:font-semibold prose-th:border prose-th:border-zinc-700 prose-th:px-3 prose-th:py-1.5
      prose-td:border prose-td:border-zinc-700 prose-td:px-3 prose-td:py-1.5
      prose-hr:border-zinc-700 prose-hr:my-3
      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
    ">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      {streaming && (
        <span className="inline-block w-0.5 h-4 bg-primary ml-0.5 animate-pulse align-text-bottom" />
      )}
    </div>
  );
}

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  const isUser = msg.role === "user";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn("flex gap-3 group", isUser ? "flex-row-reverse" : "flex-row")}
    >
      {/* Avatar */}
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5",
        isUser
          ? "bg-primary/20 border border-primary/30"
          : "bg-zinc-800 border border-zinc-700"
      )}>
        {isUser
          ? <User className="w-4 h-4 text-primary" />
          : <Bot className="w-4 h-4 text-zinc-400" />
        }
      </div>

      {/* Content */}
      <div className={cn(
        "flex-1 max-w-[80%]",
        isUser ? "items-end" : "items-start",
        "flex flex-col"
      )}>
        <div className={cn(
          "relative rounded-2xl px-4 py-3 text-sm",
          isUser
            ? "bg-primary/15 border border-primary/20 text-foreground rounded-tr-sm"
            : "bg-zinc-900 border border-zinc-800 text-foreground rounded-tl-sm"
        )}>
          {/* Typing indicator for empty streaming message */}
          {!msg.content && msg.streaming ? (
            <div className="flex items-center gap-1 text-zinc-500 py-0.5">
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-1.5 h-1.5 bg-zinc-500 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          ) : isUser ? (
            // User messages: plain text with wrapping
            <div className="whitespace-pre-wrap break-words leading-relaxed">
              {msg.content}
            </div>
          ) : (
            // AI messages: full markdown rendering
            <MarkdownContent content={msg.content} streaming={msg.streaming} />
          )}

          {/* Copy button for AI messages */}
          {!isUser && msg.content && !msg.streaming && (
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded transition-all"
              title="Copy response"
            >
              {copied
                ? <Check className="w-3 h-3 text-emerald-400" />
                : <Copy className="w-3 h-3 text-zinc-500" />
              }
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

export function ChatPanel({ token, user, onUserUpdate }: ChatPanelProps) {
  const { messages, sendMessage, stop, isStreaming, error, setError, clearMessages } = useChat(token);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isOwner = user.role === "owner";
  const questionsLeft = isOwner ? null : Math.max(0, user.questionsLimit - user.questionsToday);
  const limitReached = !isOwner && user.questionsToday >= user.questionsLimit;

  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isStreaming || limitReached) return;
    const msg = input.trim();
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    await sendMessage(msg, (result) => {
      if (result.questionsToday !== undefined) {
        onUserUpdate({ questionsToday: result.questionsToday });
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950/30 rounded-2xl border border-white/5 overflow-hidden">
      {/* Chat header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-zinc-950/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">AI Assistant</span>
          <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
            {isOwner ? "GPT-5.2 • Unlimited" : `GPT-5.1 • ${questionsLeft} left today`}
          </span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={clearMessages}
            className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Clear chat
          </button>
        )}
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
              <Bot className="w-8 h-8 text-zinc-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-zinc-400">Ask me anything</p>
              <p className="text-xs text-zinc-600 mt-1">Math, science, writing, trivia, analysis...</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {["What's the speed of light?", "Explain quantum entanglement", "Write a haiku about coding"].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setInput(s); textareaRef.current?.focus(); }}
                  className="text-xs bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-400 hover:text-foreground px-3 py-1.5 rounded-full transition-all"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
          </AnimatePresence>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="mx-4 mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg flex items-center justify-between flex-shrink-0">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-400/70 hover:text-red-400 ml-2">✕</button>
        </div>
      )}

      {/* Limit warning */}
      {limitReached && !error && (
        <div className="mx-4 mb-2 text-xs text-orange-400 bg-orange-500/10 border border-orange-500/20 px-3 py-2 rounded-lg flex-shrink-0">
          You've used all 10 daily questions. Resets at midnight!
        </div>
      )}

      {/* Input area */}
      <div className="p-3 border-t border-white/5 flex-shrink-0">
        <div className="flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary transition-all">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder={limitReached ? "Daily limit reached. Come back tomorrow!" : "Ask anything... (Enter to send, Shift+Enter for new line)"}
            disabled={isStreaming || limitReached}
            rows={1}
            className="flex-1 bg-transparent resize-none text-sm text-foreground placeholder:text-zinc-600 focus:outline-none disabled:opacity-50 max-h-40 py-1"
          />
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="p-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-all flex-shrink-0"
            >
              <StopCircle className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || limitReached}
              className="p-2 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
