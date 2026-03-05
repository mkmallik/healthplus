import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import client from "../api/client";

interface User {
  id: number;
  username: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const savedToken = await AsyncStorage.getItem("auth_token");
      if (savedToken) {
        const res = await client.get("/auth/me");
        setUser(res.data);
        setToken(savedToken);
      }
    } catch {
      await AsyncStorage.removeItem("auth_token");
    } finally {
      setLoading(false);
    }
  };

  const login = async (username: string, password: string) => {
    const res = await client.post("/auth/login", { username, password });
    const { token: newToken, user: newUser } = res.data;
    await AsyncStorage.setItem("auth_token", newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = async () => {
    try {
      await client.post("/auth/logout");
    } catch {
      // Ignore errors on logout
    }
    await AsyncStorage.removeItem("auth_token");
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
