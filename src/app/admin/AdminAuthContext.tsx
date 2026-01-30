"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";

type AdminAuthContextType = {
  token: string;
  isAuthenticated: boolean;
  isValidating: boolean;
  validationError: string | null;
  validateAndSetToken: (token: string) => Promise<boolean>;
  logout: () => void;
};

const AdminAuthContext = createContext<AdminAuthContextType | null>(null);

const STORAGE_KEY = "kowai_admin_token";

export function AdminAuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState("");
  const [mounted, setMounted] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // マウント時にlocalStorageから読み込み
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setTokenState(stored);
      }
    } catch {
      // localStorage unavailable
    }
    setMounted(true);
  }, []);

  // トークンを検証してから保存
  const validateAndSetToken = useCallback(async (newToken: string): Promise<boolean> => {
    if (!newToken.trim()) {
      setValidationError("トークンを入力してください");
      return false;
    }

    setIsValidating(true);
    setValidationError(null);

    try {
      // ダッシュボードAPIで検証
      const res = await fetch("/api/admin/dashboard", {
        headers: { Authorization: `Bearer ${newToken}` },
      });

      if (res.ok) {
        setTokenState(newToken);
        try {
          localStorage.setItem(STORAGE_KEY, newToken);
        } catch {
          // localStorage unavailable
        }
        return true;
      } else {
        const data = await res.json();
        setValidationError(data.error || "認証に失敗しました");
        return false;
      }
    } catch {
      setValidationError("認証の確認中にエラーが発生しました");
      return false;
    } finally {
      setIsValidating(false);
    }
  }, []);

  const logout = useCallback(() => {
    setTokenState("");
    setValidationError(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const isAuthenticated = token.length > 0;

  // SSR対策: マウント前は空のトークンで
  if (!mounted) {
    return (
      <AdminAuthContext.Provider
        value={{
          token: "",
          isAuthenticated: false,
          isValidating: false,
          validationError: null,
          validateAndSetToken: async () => false,
          logout,
        }}
      >
        {children}
      </AdminAuthContext.Provider>
    );
  }

  return (
    <AdminAuthContext.Provider
      value={{
        token,
        isAuthenticated,
        isValidating,
        validationError,
        validateAndSetToken,
        logout,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error("useAdminAuth must be used within AdminAuthProvider");
  }
  return context;
}
