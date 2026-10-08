"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../lib/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register, account } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "client" });

  async function submit(event) {
    event.preventDefault();
    const user = await register(form);
    if (user) router.push(user.role === "client" ? "/client" : "/freelancer");
  }

  return (
    <section className="card auth">
      <h2>Create an account</h2>
      <form onSubmit={submit}>
        <input placeholder="Full name" required value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input type="email" placeholder="Email" required value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })} />
        <input type="password" placeholder="Password (min 6 characters)" required value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} />
        <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
          <option value="client">Client</option>
          <option value="freelancer">Freelancer</option>
        </select>
        <p className="hint">
          {account
            ? `Wallet to be saved: ${account.slice(0, 6)}...${account.slice(-4)}`
            : "Tip: connect MetaMask (top right) first to attach your wallet."}
        </p>
        <button type="submit">Create Account</button>
      </form>
    </section>
  );
}
