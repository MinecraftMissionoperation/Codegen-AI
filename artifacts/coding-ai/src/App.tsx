import { useState } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import NotFound from "@/pages/not-found";
import { useAuth } from "@/hooks/use-auth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function AuthGate() {
  const { user, token, loading, login, register, checkUsername, logout, updateUserInfo } = useAuth();
  const [authView, setAuthView] = useState<"login" | "register">("login");

  if (loading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    if (authView === "register") {
      return (
        <Register
          onSwitchToLogin={() => setAuthView("login")}
          register={register}
          checkUsername={checkUsername}
        />
      );
    }
    return (
      <Login
        onSwitchToRegister={() => setAuthView("register")}
        login={login}
      />
    );
  }

  return (
    <Switch>
      <Route path="/" component={() => <Home user={user} token={token} onLogout={logout} onUserUpdate={updateUserInfo} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthGate />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
