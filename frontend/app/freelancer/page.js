"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { useRequireRole } from "../../lib/useRequireRole";
import ProjectCard from "../../components/ProjectCard";

export default function FreelancerDashboard() {
  const allowed = useRequireRole("freelancer");
  const { user, token, setMessage } = useAuth();
  const [projects, setProjects] = useState([]);
  const [proposals, setProposals] = useState([]);

  useEffect(() => {
    if (!allowed) return;
    api("/projects").then(setProjects).catch((e) => setMessage(e.message));
    api("/proposals/mine", { token }).then(setProposals).catch((e) => setMessage(e.message));
  }, [allowed, token, setMessage]);

  if (!allowed) return <div className="empty">Loading...</div>;

  const open = projects.filter((p) => p.status === "open");
  const assigned = projects.filter((p) => String(p.freelancer?._id) === String(user.id));

  return (
    <>
      <h2>Freelancer dashboard</h2>

      <div className="stats">
        <div className="stat"><b>{open.length}</b>Open projects</div>
        <div className="stat"><b>{proposals.length}</b>My proposals</div>
        <div className="stat"><b>{assigned.length}</b>Assigned to me</div>
      </div>

      <h3>My projects</h3>
      {assigned.length === 0 && <div className="empty">No assigned projects yet.</div>}
      <div className="projectGrid">
        {assigned.map((p) => (
          <ProjectCard key={p._id} project={p}>
            <Link href={`/freelancer/projects/${p._id}`} className="btn">Open</Link>
          </ProjectCard>
        ))}
      </div>

      <h3 style={{ marginTop: 28 }}>My proposals</h3>
      {proposals.length === 0 && <div className="empty">You have not submitted any proposals.</div>}
      {proposals.map((p) => (
        <div className="proposal" key={p._id}>
          <div>
            <strong>{p.project?.title}</strong>
            <div>Bid: {p.bid} ETH</div>
          </div>
          <span className="badge">{p.status}</span>
        </div>
      ))}

      <h3 style={{ marginTop: 28 }}>Open projects</h3>
      {open.length === 0 && <div className="empty">No open projects right now.</div>}
      <div className="projectGrid">
        {open.map((p) => (
          <ProjectCard key={p._id} project={p}>
            <Link href={`/freelancer/projects/${p._id}`} className="btn">View &amp; propose</Link>
          </ProjectCard>
        ))}
      </div>
    </>
  );
}
