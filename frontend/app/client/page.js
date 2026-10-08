"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "../../lib/api";
import { useAuth } from "../../lib/AuthContext";
import { useRequireRole } from "../../lib/useRequireRole";
import ProjectCard from "../../components/ProjectCard";

export default function ClientDashboard() {
  const allowed = useRequireRole("client");
  const { user, setMessage } = useAuth();
  const [projects, setProjects] = useState([]);

  useEffect(() => {
    if (!allowed) return;
    api("/projects")
      .then((all) => setProjects(all.filter((p) => String(p.client?._id) === String(user.id))))
      .catch((e) => setMessage(e.message));
  }, [allowed, user, setMessage]);

  if (!allowed) return <div className="empty">Loading...</div>;

  const count = (s) => projects.filter((p) => p.status === s).length;

  return (
    <>
      <div className="row">
        <h2>Client dashboard</h2>
        <Link href="/client/create" className="btn">+ Create project</Link>
      </div>

      <div className="stats">
        <div className="stat"><b>{projects.length}</b>Total projects</div>
        <div className="stat"><b>{count("open")}</b>Open</div>
        <div className="stat"><b>{count("in-progress")}</b>In progress</div>
      </div>

      {projects.length === 0 && <div className="empty">You have no projects yet.</div>}
      <div className="projectGrid">
        {projects.map((p) => (
          <ProjectCard key={p._id} project={p}>
            <Link href={`/client/projects/${p._id}`} className="btn">Manage</Link>
          </ProjectCard>
        ))}
      </div>
    </>
  );
}
