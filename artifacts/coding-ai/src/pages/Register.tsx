import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Code2, Lock, User, Eye, EyeOff, UserPlus, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface RegisterProps {
  onSwitchToLogin: () => void;
}

type UsernameStatus = "idle" | "checking" | "available" | "taken" | "invalid";

export default function Register({ onSwitchToLogin }: RegisterProps) {
  const { register, checkUsername } = useAuth();
  const [step, setStep] = useState<"username" | "password">("username");
  const [username, setUsername] = useState("");
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced username check
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = username.toLowerCase().trim();

    if (!trimmed) {
      setUsernameStatus("idle");
      return;
    }

    if (!/^[a-z0-9_]+$/.test(trimmed) || trimmed.length < 3 || trimmed.length > 30) {
      setUsernameStatus("invalid");
      return;
    }

    setUsernameStatus("checking");
    debounceRef.current = setTimeout(async () => {
      const available = await checkUsername(trimmed);
      setUsernameStatus(available ? "available" : "taken");
    }, 500);
  }, [username, checkUsername]);

  const handleUsernameStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (usernameStatus !== "available") return;
    setError(null);
    setStep("password");
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError(null);
    const err = await register(username.toLowerCase().trim(), password);
    if (err) setError(err);
    setLoading(false);
  };

  const passwordsMatch = confirm.length > 0 && password === confirm;
  const passwordMismatch = confirm.length > 0 && password !== confirm;

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md px-4"
      >
        <div className="bg-zinc-950/70 border border-white/10 rounded-2xl p-8 backdrop-blur-md shadow-2xl">
          {/* Logo */}
          <div className="flex flex-col items-center mb-8">
            <div className="w-12 h-12 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center mb-4">
              <Code2 className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Create an account</h1>
            <p className="text-sm text-zinc-500 mt-1">Join Codegen AI today</p>
          </div>

          {/* Step indicator */}
          <div className="flex items-center gap-2 mb-6">
            <div className={`flex-1 h-1 rounded-full transition-all duration-300 ${step === "username" ? "bg-primary" : "bg-primary"}`} />
            <div className={`flex-1 h-1 rounded-full transition-all duration-300 ${step === "password" ? "bg-primary" : "bg-zinc-800"}`} />
          </div>

          {step === "username" ? (
            <form onSubmit={handleUsernameStep} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-400">Choose a username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="coolcoder42"
                    autoFocus
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {usernameStatus === "checking" && <Loader2 className="w-4 h-4 text-zinc-500 animate-spin" />}
                    {usernameStatus === "available" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    {(usernameStatus === "taken" || usernameStatus === "invalid") && <XCircle className="w-4 h-4 text-red-400" />}
                  </div>
                </div>
                <p className="text-xs text-zinc-500 px-1">
                  {usernameStatus === "available" && <span className="text-emerald-400">Username is available!</span>}
                  {usernameStatus === "taken" && <span className="text-red-400">Username is already taken</span>}
                  {usernameStatus === "invalid" && <span className="text-red-400">3-30 characters, letters/numbers/underscores only</span>}
                  {usernameStatus === "idle" && "Lowercase letters, numbers, and underscores only"}
                </p>
              </div>

              <button
                type="submit"
                disabled={usernameStatus !== "available"}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
              >
                Continue →
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="flex items-center gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setStep("username")}
                  className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  ← Back
                </button>
                <span className="text-sm text-zinc-400">
                  Creating account for <span className="text-primary font-medium">@{username.toLowerCase().trim()}</span>
                </span>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-400">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    autoFocus
                    autoComplete="new-password"
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-zinc-400">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Type it again"
                    autoComplete="new-password"
                    className={`w-full bg-zinc-900 border rounded-xl pl-10 pr-10 py-3 text-sm text-foreground placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition-all ${
                      passwordMismatch
                        ? "border-red-500/50 focus:ring-red-500/30"
                        : passwordsMatch
                        ? "border-emerald-500/50 focus:ring-emerald-500/30"
                        : "border-zinc-800 focus:ring-primary/50 focus:border-primary"
                    }`}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {confirm.length > 0 && (
                      passwordsMatch
                        ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        : <XCircle className="w-4 h-4 text-red-400" />
                    )}
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className="text-zinc-500 hover:text-zinc-300 transition-colors ml-1"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !password || !confirm}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold bg-gradient-to-r from-primary to-emerald-500 text-primary-foreground shadow-[0_0_20px_rgba(20,184,166,0.3)] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 mt-2"
              >
                {loading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {loading ? "Creating account..." : "Create Account"}
              </button>
            </form>
          )}

          <p className="text-sm text-center text-zinc-500 mt-6">
            Already have an account?{" "}
            <button
              onClick={onSwitchToLogin}
              className="text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Sign in
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
