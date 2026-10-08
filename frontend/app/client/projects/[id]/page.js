"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { isAddress } from "ethers";
import { api } from "../../../../lib/api";
import { useAuth } from "../../../../lib/AuthContext";
import { useRequireRole } from "../../../../lib/useRequireRole";
import { deployContract, milestoneAction, explain } from "../../../../lib/contract";
import ProjectCard from "../../../../components/ProjectCard";
import MilestoneList from "../../../../components/MilestoneList";

export default function ClientProject() {
  const { id } = useParams();
  const allowed = useRequireRole("client");
  const { user, token, setMessage } = useAuth();
  const [project, setProject] = useState(null);
  const [proposals, setProposals] = useState([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const p = await api(`/projects/${id}`);
      setProject(p);
      if (p.status === "open" && String(p.client?._id) === String(user.id)) {
        setProposals(await api(`/projects/${id}/proposals`, { token }));
      } else {
        setProposals([]);
      }
    } catch (error) {
      setMessage(error.message);
    }
  }, [id, token, user, setMessage]);

  useEffect(() => {
    if (allowed) load();
  }, [allowed, load]);

  async function accept(proposalId) {
    try {
      await api(`/proposals/${proposalId}/accept`, { method: "POST", token });
      setMessage("Proposal accepted. Freelancer assigned.");
      load();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createContract() {
    setBusy(true);
    try {
      const wallet = project.freelancer?.wallet;
      if (!isAddress(wallet || ""))
        throw new Error("The freelancer has not saved a wallet yet. Ask them to click 'Save wallet'.");
      const { address, txHash } = await deployContract(wallet, project.milestones, setMessage);
      await api(`/projects/${id}/contract`, {
        method: "POST",
        token,
        body: { contractAddress: address, txHash },
      });
      setMessage("Smart contract created.");
      await load();
    } catch (error) {
      setMessage(explain(error));
    } finally {
      setBusy(false);
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
  if (String(project.client?._id) !== String(user.id))
    return <div className="empty">This is not your project.</div>;

  return (
    <>
      <Link href="/client" className="btn secondary">&larr; Back</Link>
      <div style={{ height: 16 }} />
      <ProjectCard project={project} hideMilestones={project.status !== "open" && !!project.milestones} />

      {project.status === "open" && (
        <section className="card">
          <h2>Proposals ({proposals.length})</h2>
          {proposals.length === 0 && <div className="empty">No proposals yet.</div>}
          {proposals.map((p) => (
            <div className="proposal" key={p._id}>
              <div>
                <strong>{p.freelancer?.name}</strong>
                <div>Bid: {p.bid} ETH</div>
                <small>{p.message}</small>
              </div>
              <button onClick={() => accept(p._id)}>Accept</button>
            </div>
          ))}
        </section>
      )}

      {project.status === "in-progress" && !project.freelancerAccepted && (
        <section className="card">
          <p className="hint">Waiting for the freelancer to confirm the project.</p>
        </section>
      )}

      {project.freelancerAccepted && !project.contractAddress && (
        <section className="card">
          <h2>Smart contract</h2>
          <p className="hint">
            Use the <b>client</b> MetaMask account. You will confirm one deployment
            and one transaction per milestone.
          </p>
          <button disabled={busy} onClick={createContract}>Create Smart Contract</button>
        </section>
      )}

      {project.contractAddress && (
        <section className="card">
          <h2>Smart contract</h2>
          <small>Address: {project.contractAddress}</small>
        </section>
      )}

      {project.status !== "open" && (
        <MilestoneList project={project} role="client" busy={busy} onAction={onAction} />
      )}
    </>
  );
}
