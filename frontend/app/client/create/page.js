"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../lib/api";
import { useAuth } from "../../../lib/AuthContext";
import { useRequireRole } from "../../../lib/useRequireRole";

export default function CreateProject() {
  const allowed = useRequireRole("client");
  const router = useRouter();
  const { token, setMessage } = useAuth();
  const [form, setForm] = useState({ title: "", description: "", budget: "" });
  const [milestones, setMilestones] = useState([{ title: "", amount: "" }]);

  function updateMilestone(i, field, value) {
    setMilestones(milestones.map((m, idx) => (idx === i ? { ...m, [field]: value } : m)));
  }

  async function submit(event) {
    event.preventDefault();
    try {
      await api("/projects", {
        method: "POST",
        token,
        body: {
          title: form.title,
          description: form.description,
          budget: Number(form.budget),
          milestones: milestones.map((m) => ({ title: m.title, amount: Number(m.amount) })),
        },
      });
      setMessage("Project created.");
      router.push("/client");
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (!allowed) return <div className="empty">Loading...</div>;

  return (
    <section className="card">
      <h2>Create a project</h2>
      <form onSubmit={submit}>
        <div className="grid">
          <input placeholder="Project title" required value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input type="number" step="any" min="0" placeholder="Budget (ETH)" required value={form.budget}
            onChange={(e) => setForm({ ...form, budget: e.target.value })} />
        </div>
        <textarea placeholder="Description" required value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })} />

        <h3>Milestones</h3>
        {milestones.map((m, i) => (
          <div className="grid" key={i}>
            <input placeholder={`Milestone ${i + 1} title`} required value={m.title}
              onChange={(e) => updateMilestone(i, "title", e.target.value)} />
            <div className="row">
              <input type="number" step="any" min="0.0001" placeholder="Amount (ETH)" required value={m.amount}
                onChange={(e) => updateMilestone(i, "amount", e.target.value)} />
              {milestones.length > 1 && (
                <button type="button" className="secondary"
                  onClick={() => setMilestones(milestones.filter((_, idx) => idx !== i))}>
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
        <button type="button" className="secondary"
          onClick={() => setMilestones([...milestones, { title: "", amount: "" }])}>
          + Add milestone
        </button>

        <button type="submit">Create project</button>
      </form>
    </section>
  );
}
