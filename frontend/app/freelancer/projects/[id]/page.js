"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../lib/AuthContext";
import { useRequireRole } from "../../../../lib/useRequireRole";
import { milestoneAction, explain } from "../../../../lib/contract";
import ProjectCard from "../../../../components/ProjectCard";
import MilestoneList from "../../../../components/MilestoneList";

export default function FreelancerProject() {
  const { id } = useParams();
  const allowed = useRequireRole("freelancer");
  const { user, token, setMessage } = useAuth();
  const [project, setProject] = useState(null);
  const [form, setForm] = useState({ message: "", bid: "" });
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      setProject(await api(`/projects/${id}`));
    } catch (error) {
      setMessage(error.message);
    }
  }, [id, setMessage]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  async function propose(event) {
    event.preventDefault();
    try {
      await api(`/projects/${id}/proposals`, {
        method: "POST",
        token,
        body: { message: form.message, bid: Number(form.bid) },
      });
      setMessage("Proposal submitted.");
      setForm({ message: "", bid: "" });
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function confirm() {
    try {
      await api(`/projects/${id}/confirm`, { method: "POST", token });
      setMessage("Project confirmed.");
      load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function onAction(action, index) {
    setBusy(true);
    try {
      setMessage("Confirm the transaction in MetaMask...");
      const m = project.milestones[index];
      const txHash = await milestoneAction(project.contractAddress, action, index, m.amount);
      try {
        await api(`/projects/${id}/milestones/${index}/tx`, {
          method: "POST",
          token,
          body: { action, txHash },
        });
        setMessage(`Done. Transaction ${txHash.slice(0, 10)}...`);
      } catch (error) {
        setMessage(`On-chain transaction succeeded (${txHash}) but saving failed: ${error.message}`);
      }
      await load();
    } catch (error) {
      setMessage(explain(error));
    } finally {
      setBusy(false);
    }
  }

  if (!allowed || !project) return <div className="empty">Loading...</div>;

  const mine = String(project.freelancer?._id) === String(user.id);

  return (
    <>
      <Link href="/freelancer" className="btn secondary">&larr; Back</Link>
      <div style={{ height: 16 }} />
      <ProjectCard project={project} hideMilestones={mine && project.freelancerAccepted}>
        {mine && !project.freelancerAccepted && (
          <button onClick={confirm}>Confirm &amp; start project</button>
        )}
      </ProjectCard>

      {project.status === "open" && (
        <section className="card">
          <h2>Submit a proposal</h2>
          <form onSubmit={propose}>
            <textarea placeholder="Why are you a good fit?" required value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })} />
            <input type="number" step="any" min="0" placeholder="Your bid (ETH)" required value={form.bid}
              onChange={(e) => setForm({ ...form, bid: e.target.value })} />
            <button type="submit">Submit proposal</button>
          </form>
        </section>
      )}

      {mine && project.freelancerAccepted && !project.contractAddress && (
        <section className="card">
          <p className="hint">Waiting for the client to create the smart contract.</p>
        </section>
      )}

      {mine && project.contractAddress && (
        <>
          <section className="card">
            <h2>Smart contract</h2>
            <small>Address: {project.contractAddress}</small>
            <p className="hint">Use the <b>freelancer</b> MetaMask account to submit work.</p>
          </section>
          <MilestoneList project={project} role="freelancer" busy={busy} onAction={onAction} />
        </>
      )}
    </>
  );
}
