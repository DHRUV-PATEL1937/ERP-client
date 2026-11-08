import React, { createContext, useContext, useState, useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { api, setToken } from "../lib/api";
const Auth = createContext(null);
const Toast = createContext(null);
export const useAuth = () => useContext(Auth);
export const useToast = () => useContext(Toast);
const client = new QueryClient({
  defaultOptions: { queries: { retry: 1, staleTime: 15000 } },
});
export function Providers({ children }) {
  const [session, setSession] = useState(null);
  const [toast, setToast] = useState("");
  useEffect(() => {
    const expired = () => {
      setToken(null);
      setSession(null);
      client.clear();
    };
    window.addEventListener("session-expired", expired);
    return () => window.removeEventListener("session-expired", expired);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(""), 5000);
    return () => clearTimeout(timer);
  }, [toast]);
  const login = async (values) => {
    const { data } = await api("/auth/login", { method: "POST", body: values });
    setToken(data.token);
    setSession(data);
  };
  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setToken(null);
      setSession(null);
      client.clear();
    }
  };
  return (
    <QueryClientProvider client={client}>
      <Auth.Provider value={{ session, login, logout, setSession }}>
        <Toast.Provider value={setToast}>
          {children}
          {toast && (
            <div className="toast" role="status">
              {toast}
              <button
                aria-label="Dismiss notification"
                onClick={() => setToast("")}
              >
                ×
              </button>
            </div>
          )}
        </Toast.Provider>
      </Auth.Provider>
    </QueryClientProvider>
  );
}
