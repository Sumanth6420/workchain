"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "../lib/AuthContext";

export default function Navbar() {
  const router = useRouter();
  const { user, account, connectMetaMask, saveWallet, logout } = useAuth();
  const dashboard = user ? (user.role === "client" ? "/client" : "/freelancer") : null;

  return (
    <header className="header">
      <Link href="/" className="logo">WorkChain</Link>

      <div className="headerActions">
        {dashboard && <Link href={dashboard} className="btn secondary">Dashboard</Link>}
        {user && <Link href="/transactions" className="btn secondary">Transactions</Link>}
        {user && <span className="userBadge">{user.name} ({user.role})</span>}

        {account ? (
          <span className="wallet">{account.slice(0, 6)}...{account.slice(-4)}</span>
        ) : (
          <button onClick={connectMetaMask}>Connect MetaMask</button>
        )}

        {user && account && (
          <button className="secondary" onClick={saveWallet}>Save wallet</button>
        )}

        {user ? (
          <button className="secondary" onClick={() => { logout(); router.push("/"); }}>
            Logout
          </button>
        ) : (
          <>
            <Link href="/login" className="btn secondary">Login</Link>
            <Link href="/register" className="btn">Register</Link>
          </>
        )}
      </div>
    </header>
  );
}
