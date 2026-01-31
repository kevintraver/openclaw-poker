"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";
import { getApiKey, saveApiKey as saveKey, clearApiKey } from "../lib/auth";

interface AgentData {
  _id: Id<"agents">;
  name: string;
  shells: number;
  handsPlayed: number;
  handsWon: number;
}

interface AuthState {
  agentId: Id<"agents"> | null;
  agentData: AgentData | null;
  apiKey: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (apiKey: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load API key from localStorage on mount
  useEffect(() => {
    const storedKey = getApiKey();
    if (storedKey) {
      setApiKey(storedKey);
    }
    setIsLoading(false);
  }, []);

  // Fetch agent data if we have an API key
  const agentData = useQuery(
    api.agents.getByApiKey,
    apiKey ? { apiKey } : "skip"
  );

  const login = (newApiKey: string) => {
    saveKey(newApiKey);
    setApiKey(newApiKey);
  };

  const logout = () => {
    clearApiKey();
    setApiKey(null);
  };

  const value: AuthState = {
    agentId: agentData?._id ?? null,
    agentData: agentData ?? null,
    apiKey,
    isAuthenticated: !!agentData,
    isLoading: isLoading || (apiKey !== null && agentData === undefined),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
