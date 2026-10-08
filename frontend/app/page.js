"use client";

import { useEffect, useState } from "react";
import { api } from "../lib/api";
import ProjectCard from "../components/ProjectCard";

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/projects")
      .then(setProjects)
      .catch(() => setError("Backend connection failed."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <section className="hero">
        <h1>Freelancing with<br />transparent payments.</h1>
        <p>
          Create projects, agree on milestones, store documents in the cloud and
          release payments through smart contracts.
        </p>
      </section>

      <h2>Projects</h2>
      {loading && <div className="empty">Loading...</div>}
      {error && <div className="empty">{error}</div>}
      {!loading && !error && projects.length === 0 && (
        <div className="empty">No projects yet.</div>
      )}
      <div className="projectGrid">
        {projects.map((p) => <ProjectCard key={p._id} project={p} />)}
      </div>
    </>
  );
}
