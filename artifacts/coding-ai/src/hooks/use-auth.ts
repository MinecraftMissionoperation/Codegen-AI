import { useState, useCallback, useEffect } from "react";

export interface UserInfo {
  id: number;
  username: string;
  role: string;
  questionsToday: number;
  questionsLimit: number;
}

const TOKEN_KEY = "codegen_ai_token";

function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function useAuth() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [token, setTokenState] = useState<string | null>(getToken);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = getToken();
    if (!stored) {
      setLoading(false);
      return;
    }

    fetch("/api/auth/me", {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error("Invalid token");
        return r.json();
      })
      .then((u: UserInfo) => {
        setUser(u);
        setTokenState(stored);
      })
      .catch(() => {
        clearToken();
        setTokenState(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || "Login failed";
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    return null;
  }, []);

  const register = useCallback(async (username: string, password: string): Promise<string | null> => {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) return data.error || "Registration failed";
    setToken(data.token);
    setTokenState(data.token);
    setUser(data.user);
    return null;
  }, []);

  const checkUsername = useCallback(async (username: string): Promise<boolean> => {
    const res = await fetch("/api/auth/check-username", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const data = await res.json();
    return data.available === true;
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const updateUserInfo = useCallback((info: Partial<UserInfo>) => {
    setUser((prev) => prev ? { ...prev, ...info } : null);
  }, []);

  return { user, token, loading, login, register, logout, checkUsername, updateUserInfo };
}
