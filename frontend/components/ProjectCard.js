export default function ProjectCard({ project, children, hideMilestones }) {
  return (
    <div className="projectCard">
      <h3>{project.title}</h3>
      <p>{project.description}</p>

      <div className="projectInfo">
        <span>Budget: {project.budget} ETH</span>
        <span className="badge">{project.status}</span>
      </div>

      <small>Client: {project.client?.name || "Unknown"}</small>

      {project.freelancer && (
        <small>
          Freelancer: {project.freelancer.name}
          {project.freelancerAccepted ? " (confirmed)" : " (awaiting confirmation)"}
        </small>
      )}

      {project.contractAddress && (
        <small>
          Contract: {project.contractAddress.slice(0, 8)}...{project.contractAddress.slice(-6)}
        </small>
      )}

      {!hideMilestones && project.milestones?.map((m, i) => (
        <div className="milestone" key={m._id || i}>
          <strong>{m.title}</strong>
          <span>{m.amount} ETH</span>
        </div>
      ))}

      {children}
    </div>
  );
}
