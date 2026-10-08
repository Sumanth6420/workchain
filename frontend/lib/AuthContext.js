"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState("");
  const [account, setAccount] = useState("");
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem("wc_token");
    const savedUser = localStorage.getItem("wc_user");
    if (savedToken && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        setToken(savedToken);
      } catch {
        localStorage.removeItem("wc_user");
        localStorage.removeItem("wc_token");
      }
    }
    setReady(true);

    if (window.ethereum) {
      window.ethereum
        .request({ method: "eth_accounts" })
        .then((a) => setAccount(a[0] || ""))
        .catch(() => {});
      const onChange = (a) => setAccount(a[0] || "");
      window.ethereum.on?.("accountsChanged", onChange);
      return () => window.ethereum.removeListener?.("accountsChanged", onChange);
    }
  }, []);

  async function connectMetaMask() {
    try {
      if (!window.ethereum) return setMessage("MetaMask is not installed.");
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      setAccount(accounts[0] || "");
      setMessage("MetaMask connected.");
    } catch {
      setMessage("MetaMask connection failed.");
    }
  }

  function saveSession(data) {
    localStorage.setItem("wc_token", data.token);
    localStorage.setItem("wc_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
  }

  async function login(email, password) {
    try {
      const data = await api("/auth/login", { method: "POST", body: { email, password } });
      saveSession(data);
      setMessage("Login successful.");
      return data.user;
    } catch (error) {
      setMessage(error.message);
      return null;
    }
  }

  async function register(form) {
    try {
      const data = await api("/auth/register", {
        method: "POST",
        body: { ...form, wallet: account || "" },
      });
      saveSession(data);
      setMessage("Registration successful.");
      return data.user;
    } catch (error) {
      setMessage(error.message);
      return null;
    }
  }

  function logout() {
    localStorage.removeItem("wc_token");
    localStorage.removeItem("wc_user");
    setToken("");
    setUser(null);
    setMessage("Logged out.");
  }

  async function saveWallet() {
    try {
      await api("/me/wallet", { method: "PATCH", body: { wallet: account }, token });
      setMessage("Wallet saved to your account.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <AuthContext.Provider
      value={{ user, token, account, message, setMessage, ready,
        connectMetaMask, login, register, logout, saveWallet }}
    >
      {children}
    </AuthContext.Provider>
  );
}
