"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";

export default function Transactions() {
  const router = useRouter();
  const { user, ready, setMessage } = useAuth();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (!ready) return;
    if (!user) return router.replace("/login");
    api("/projects")
      .then((all) =>
        setProjects(
          all.filter((p) =>
            user.role === "client"
              ? String(p.client?._id) === String(user.id)
              : String(p.freelancer?._id) === String(user.id)
          )
        )
      )
      .catch((e) => setMessage(e.message));
  }, [ready, user, router, setMessage]);

  const rows = [];
  projects.forEach((p) => {
    if (p.contractTx)
      rows.push({ project: p.title, event: "Contract deployed", amount: "", hash: p.contractTx });
    p.milestones.forEach((m) => {
      if (m.fundTx) rows.push({ project: p.title, event: `Funded: ${m.title}`, amount: m.amount, hash: m.fundTx });
      if (m.submitTx) rows.push({ project: p.title, event: `Submitted: ${m.title}`, amount: "", hash: m.submitTx });
      if (m.approveTx) rows.push({ project: p.title, event: `Payment released: ${m.title}`, amount: m.amount, hash: m.approveTx });
    });
  });

  if (!ready || !user) return <div className="empty">Loading...</div>;

  return (
    <>
      <h2>Blockchain transactions</h2>
      <p className="hint">
        These are recorded on your local Hardhat chain. Hashes are stored with each milestone.
      </p>
      {rows.length === 0 && <div className="empty">No transactions yet.</div>}
      {rows.map((r, i) => (
        <div className="proposal" key={i}>
          <div>
            <strong>{r.event}</strong>
            <div><small>{r.project}</small></div>
            <div><small style={{ wordBreak: "break-all" }}>{r.hash}</small></div>
          </div>
          <div>{r.amount !== "" ? `${r.amount} ETH` : ""}</div>
        </div>
      ))}
    </>
  );
}
