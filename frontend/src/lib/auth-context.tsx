"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export interface UserProfile {
  name: string;
  email: string;
  avatar?: string;
  role: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLocked: boolean;
  isLoading: boolean;
  login: (email: string, password?: string, rememberMe?: boolean) => Promise<boolean>;
  loginWithFaceId: () => Promise<boolean>;
  loginWithPasscode: (passcode: string) => Promise<boolean>;
  loginWithGoogle: () => Promise<boolean>;
  lock: () => void;
  unlock: () => void;
  logout: () => void;
}

const DEFAULT_USER: UserProfile = {
  name: "Danush",
  email: "danush@paytrace.app",
  avatar: "/finora-fox-mascot.png",
  role: "Account Owner",
  lastLogin: "Today, Just now",
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize from localStorage
  useEffect(() => {
    try {
      const storedToken = localStorage.getItem("finora_auth_token");
      const storedUser = localStorage.getItem("finora_user_profile");
      const storedLockState = localStorage.getItem("finora_app_locked");

      if (storedToken) {
        setIsAuthenticated(true);
        if (storedUser) {
          setUser(JSON.parse(storedUser));
        } else {
          setUser(DEFAULT_USER);
        }
        setIsLocked(storedLockState === "true");
      } else {
        // Not authenticated yet
        setIsAuthenticated(false);
        setUser(null);
        setIsLocked(false);
      }
    } catch (e) {
      console.error("Auth state initialization error:", e);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, _password?: string, rememberMe: boolean = true): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 450));

    const loggedInUser: UserProfile = {
      name: email.split("@")[0] || "Danush",
      email: email,
      avatar: "/finora-fox-mascot.png",
      role: "Account Owner",
      lastLogin: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    if (rememberMe) {
      localStorage.setItem("finora_auth_token", "finora_token_" + Date.now());
      localStorage.setItem("finora_user_profile", JSON.stringify(loggedInUser));
      localStorage.removeItem("finora_app_locked");
    }

    setUser(loggedInUser);
    setIsAuthenticated(true);
    setIsLocked(false);
    setIsLoading(false);
    return true;
  };

  const loginWithFaceId = async (): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 600));

    localStorage.setItem("finora_auth_token", "finora_token_faceid_" + Date.now());
    localStorage.setItem("finora_user_profile", JSON.stringify(DEFAULT_USER));
    localStorage.removeItem("finora_app_locked");

    setUser(DEFAULT_USER);
    setIsAuthenticated(true);
    setIsLocked(false);
    setIsLoading(false);
    return true;
  };

  const loginWithPasscode = async (passcode: string): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 400));

    if (passcode.length >= 4) {
      localStorage.setItem("finora_auth_token", "finora_token_pin_" + Date.now());
      localStorage.setItem("finora_user_profile", JSON.stringify(DEFAULT_USER));
      localStorage.removeItem("finora_app_locked");

      setUser(DEFAULT_USER);
      setIsAuthenticated(true);
      setIsLocked(false);
      setIsLoading(false);
      return true;
    }

    setIsLoading(false);
    return false;
  };

  const loginWithGoogle = async (): Promise<boolean> => {
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    localStorage.setItem("finora_auth_token", "finora_token_google_" + Date.now());
    localStorage.setItem("finora_user_profile", JSON.stringify(DEFAULT_USER));
    localStorage.removeItem("finora_app_locked");

    setUser(DEFAULT_USER);
    setIsAuthenticated(true);
    setIsLocked(false);
    setIsLoading(false);
    return true;
  };

  const lock = () => {
    setIsLocked(true);
    localStorage.setItem("finora_app_locked", "true");
  };

  const unlock = () => {
    setIsLocked(false);
    localStorage.removeItem("finora_app_locked");
  };

  const logout = () => {
    localStorage.removeItem("finora_auth_token");
    localStorage.removeItem("finora_user_profile");
    localStorage.removeItem("finora_app_locked");
    setUser(null);
    setIsAuthenticated(false);
    setIsLocked(false);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLocked,
        isLoading,
        login,
        loginWithFaceId,
        loginWithPasscode,
        loginWithGoogle,
        lock,
        unlock,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
