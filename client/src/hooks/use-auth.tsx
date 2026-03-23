import { createContext, useContext, ReactNode, useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { fetchWithAuth, setToken, removeToken, getToken } from "../lib/api";
import { z } from "zod";
import { useToast } from "./use-toast";

type User = z.infer<typeof api.auth.me.responses[200]>;
type LoginInput = z.infer<typeof api.auth.login.input>;
type RegisterInput = z.infer<typeof api.auth.register.input>;

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  isSubmitting: boolean;
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [isReady, setIsReady] = useState(false);

  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      if (!getToken()) return null;
      try {
        return await fetchWithAuth(api.auth.me.path);
      } catch (e) {
        return null;
      }
    },
    retry: false,
  });

  useEffect(() => {
    if (!isLoading) setIsReady(true);
  }, [isLoading]);

  const loginMutation = useMutation({
    mutationFn: async (data: LoginInput) => {
      const res = await fetchWithAuth(api.auth.login.path, {
        method: api.auth.login.method,
        body: JSON.stringify(data),
      });
      return res as z.infer<typeof api.auth.login.responses[200]>;
    },
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData([api.auth.me.path], data.user);
      toast({ title: "Welcome back!" });
    },
    onError: (error: Error) => {
      toast({ title: "Login failed", description: error.message, variant: "destructive" });
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterInput) => {
      const res = await fetchWithAuth(api.auth.register.path, {
        method: api.auth.register.method,
        body: JSON.stringify(data),
      });
      return res as z.infer<typeof api.auth.register.responses[201]>;
    },
    onSuccess: (data) => {
      setToken(data.token);
      queryClient.setQueryData([api.auth.me.path], data.user);
      toast({ title: "Account created successfully!" });
    },
    onError: (error: Error) => {
      toast({ title: "Registration failed", description: error.message, variant: "destructive" });
    }
  });

  const logout = () => {
    removeToken();
    queryClient.setQueryData([api.auth.me.path], null);
    queryClient.clear();
    toast({ title: "Logged out successfully" });
  };

  if (!isReady) return null;

  return (
    <AuthContext.Provider value={{
      user: user || null,
      isLoading,
      isSubmitting: loginMutation.isPending || registerMutation.isPending,
      login: async (data) => { await loginMutation.mutateAsync(data); },
      register: async (data) => { await registerMutation.mutateAsync(data); },
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};
