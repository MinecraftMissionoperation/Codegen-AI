import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CodeBlock } from "@/components/CodeBlock";
import { ChatPanel } from "@/components/ChatPanel";
import { useCodegen } from "@/hooks/use-codegen";
import { useHistory, HistoryItem } from "@/hooks/use-history";
import { UserInfo } from "@/hooks/use-auth";
import {
  Wand2,
  Sparkles,
  Code2,
  History,
  Trash2,
  StopCircle,
  MessageSquare,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Crown,
  Zap,
  Terminal,
  BrainCircuit,
} from "lucide-react";
import { cn } from "@/lib/utils";

const LANGUAGES = [
  "TypeScript", "JavaScript", "Python", "Rust", "Go",
  "Java", "C++", "C#", "SQL", "Bash", "HTML", "CSS", "JSON",
];

type Tab = "code" | "chat";

interface HomeProps {
  user: UserInfo;
  token: string | null;
  onLogout: () => void;
  onUserUpdate: (info: Partial<UserInfo>) => void;
}

export default function Home({ user, token, onLogout, onUserUpdate }: HomeProps) {
  const [activeTab, setActiveTab] = useState<Tab>("code");
  const [prompt, setPrompt] = useState("");
  const [language, setLanguage] = useState("TypeScript");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);

  const { generate, stop, isGenerating, code, setCode, error } = useCodegen(token);
  const { history, addHistoryItem, updateHistoryItemCode, deleteHistoryItem, clearHistory } = useHistory();

  const isOwner = user.role === "owner";
  const questionsLeft = isOwner ? null : Math.max(0, user.questionsLimit - user.questionsToday);
  const limitReached = !isOwner && user.questionsToday >= user.questionsLimit;

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim() || isGenerating || limitReached) return;

    const id = Date.now().toString();
    setActiveHistoryId(id);
    addHistoryItem({ id, prompt, language, code: "", timestamp: Date.now() });

    await generate(prompt, language, (newCode) => {
      updateHistoryItemCode(id, newCode);
    }, (result) => {
      if (result.questionsToday !== undefined) {
        onUserUpdate({ questionsToday: result.questionsToday });
      }
    });
  };

  const handleSelectHistory = (item: HistoryItem) => {
    if (isGenerating) return;
    setActiveHistoryId(item.id);
    setPrompt(item.prompt);
    setLanguage(item.language);
    setCode(item.code);
  };

  const handleNew = () => {
    if (isGenerating) return;
    setActiveHistoryId(null);
    setPrompt("");
    setCode("");
  };

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden selection:bg-primary/30">
      {/* Background ambient glow */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 300, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.3 }}
            className="h-full flex-shrink-0 border-r border-white/5 bg-zinc-950/50 backdrop-blur-md flex flex-col z-10 overflow-hidden"
          >
            {/* Sidebar header */}
            <div className="p-4 flex items-center justify-between border-b border-white/5">
              <div className="flex items-center gap-2 text-foreground font-semibold">
                <Code2 className="w-5 h-5 text-primary" />
                <span className="tracking-tight">Codegen AI</span>
              </div>
              <button
                onClick={handleNew}
                className="p-1.5 hover:bg-white/10 rounded-md transition-colors"
                title="New"
              >
                <MessageSquare className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>

            {/* User info */}
            <div className="px-4 py-3 border-b border-white/5 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                {isOwner
                  ? <Crown className="w-4 h-4 text-yellow-400" />
                  : <span className="text-xs font-bold text-primary">{user.username[0].toUpperCase()}</span>
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-medium text-foreground truncate">{user.username}</span>
                  {isOwner && (
                    <span className="text-xs bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 px-1.5 py-0.5 rounded font-semibold flex-shrink-0">
                      OWNER
                    </span>
                  )}
                </div>
                <div className="text-xs text-zinc-500 mt-0.5">
                  {isOwner ? (
                    <span className="flex items-center gap-1 text-yellow-400/80">
                      <Zap className="w-3 h-3" /> Unlimited generations
                    </span>
                  ) : (
                    <span className={questionsLeft === 0 ? "text-red-400" : "text-zinc-500"}>
                      {questionsLeft} / {user.questionsLimit} questions left today
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onLogout}
                className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-zinc-500 hover:text-red-400"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>

            {/* Daily limit bar */}
            {!isOwner && (
              <div className="px-4 py-2 border-b border-white/5">
                <div className="flex justify-between text-xs text-zinc-500 mb-1.5">
                  <span>Daily questions (all modes)</span>
                  <span>{user.questionsToday}/{user.questionsLimit}</span>
                </div>
                <div className="w-full h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      user.questionsToday >= user.questionsLimit ? "bg-red-500" : "bg-gradient-to-r from-primary to-emerald-500"
                    )}
                    style={{ width: `${Math.min(100, (user.questionsToday / user.questionsLimit) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Code history (only show in code tab) */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2 flex items-center gap-2">
                <History className="w-3 h-3" />
                Code History
              </div>

              {history.length === 0 ? (
                <div className="text-sm text-zinc-500 px-2 italic">
                  No history yet. Start generating!
                </div>
              ) : (
                history.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      handleSelectHistory(item);
                      setActiveTab("code");
                    }}
                    className={cn(
                      "group relative p-3 rounded-lg cursor-pointer transition-all duration-200 border border-transparent",
                      activeHistoryId === item.id && activeTab === "code"
                        ? "bg-primary/10 border-primary/20 text-primary-foreground"
                        : "hover:bg-white/5 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className="text-sm font-medium line-clamp-2 leading-snug">{item.prompt}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs font-mono bg-black/30 px-1.5 py-0.5 rounded text-zinc-400">
                        {item.language}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteHistoryItem(item.id);
                          if (activeHistoryId === item.id) handleNew();
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {history.length > 0 && (
              <div className="p-4 border-t border-white/5">
                <button
                  onClick={clearHistory}
                  className="w-full text-xs text-muted-foreground hover:text-destructive transition-colors py-2 rounded flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-3 h-3" />
                  Clear Code History
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative z-10 min-w-0">
        {/* Header with tabs */}
        <header className="h-14 flex items-center px-4 gap-4 border-b border-white/5 shrink-0 bg-background/50 backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-muted-foreground"
          >
            {sidebarOpen ? <PanelLeftClose className="w-5 h-5" /> : <PanelLeftOpen className="w-5 h-5" />}
          </button>

          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-xl p-1">
            <button
              onClick={() => setActiveTab("code")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === "code"
                  ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <Terminal className="w-4 h-4" />
              Code
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-200",
                activeTab === "chat"
                  ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              )}
            >
              <BrainCircuit className="w-4 h-4" />
              Chat
            </button>
          </div>

          {isOwner && (
            <div className="ml-auto flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-full">
              <Crown className="w-3 h-3" />
              Owner — Unlimited
            </div>
          )}
        </header>

        {/* Tab content */}
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === "code" ? (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="h-full flex flex-col lg:flex-row p-4 md:p-6 gap-6 overflow-hidden"
              >
                {/* Left Column: Input */}
                <div className="w-full lg:w-[400px] flex flex-col gap-4 shrink-0">
                  <div className="glass-panel p-5 rounded-2xl flex flex-col h-full">
                    <div className="flex items-center gap-2 mb-4">
                      <Sparkles className="w-5 h-5 text-primary" />
                      <h2 className="font-semibold text-lg">Requirements</h2>
                    </div>

                    <form onSubmit={handleGenerate} className="flex flex-col flex-1 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-zinc-400">Language</label>
                        <div className="relative">
                          <select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            disabled={isGenerating}
                            className="w-full appearance-none bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
                          >
                            {LANGUAGES.map((l) => (
                              <option key={l} value={l}>{l}</option>
                            ))}
                          </select>
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">▼</div>
                        </div>
                      </div>

                      <div className="flex flex-col flex-1 gap-2">
                        <label className="text-sm font-medium text-zinc-400">Description</label>
                        <textarea
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                          disabled={isGenerating || limitReached}
                          placeholder={limitReached ? "Daily limit reached. Come back tomorrow!" : "Describe the function, component, or script you want to build..."}
                          className="flex-1 w-full resize-none bg-zinc-900 border border-zinc-800 rounded-xl p-4 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all disabled:opacity-50"
                        />
                      </div>

                      {error && (
                        <div className="text-xs text-destructive bg-destructive/10 p-3 rounded-lg border border-destructive/20">
                          {error}
                        </div>
                      )}

                      {limitReached && !error && (
                        <div className="text-xs text-orange-400 bg-orange-500/10 p-3 rounded-lg border border-orange-500/20">
                          You've used all 10 daily questions. Resets at midnight!
                        </div>
                      )}

                      {isGenerating ? (
                        <button
                          type="button"
                          onClick={stop}
                          className="w-full relative overflow-hidden group flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive hover:text-destructive-foreground transition-all duration-300"
                        >
                          <StopCircle className="w-5 h-5" />
                          Stop Generating
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={!prompt.trim() || limitReached}
                          className="w-full relative overflow-hidden group flex items-center justify-center gap-2 py-3.5 rounded-xl font-semibold bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground shadow-[0_0_20px_rgba(20,184,166,0.3)] hover:shadow-[0_0_25px_rgba(20,184,166,0.5)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                        >
                          <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
                          <Wand2 className="w-5 h-5 relative z-10" />
                          <span className="relative z-10">Generate Code</span>
                        </button>
                      )}
                    </form>
                  </div>
                </div>

                {/* Right Column: Output */}
                <div className="flex-1 flex flex-col min-w-0 min-h-[400px]">
                  <CodeBlock
                    code={code}
                    language={language}
                    isGenerating={isGenerating}
                    className="h-full w-full"
                  />
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="chat"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ duration: 0.15 }}
                className="h-full p-4 md:p-6"
              >
                <ChatPanel token={token} user={user} onUserUpdate={onUserUpdate} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
