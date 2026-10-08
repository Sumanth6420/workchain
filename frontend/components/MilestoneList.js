export default function MilestoneList({ project, role, busy, onAction }) {
  const short = (h) => `${h.slice(0, 10)}...${h.slice(-6)}`;
  const live = Boolean(project.contractAddress);

  return (
    <section className="card">
      <h2>Milestones</h2>
      {project.milestones.map((m, i) => (
        <div className="proposal" key={m._id || i}>
          <div>
            <strong>{m.title}</strong> &middot; {m.amount} ETH
            <div><span className="badge">{m.status}</span></div>
            {m.fundTx && <div><small>Funded: {short(m.fundTx)}</small></div>}
            {m.submitTx && <div><small>Submitted: {short(m.submitTx)}</small></div>}
            {m.approveTx && <div><small>Payment released: {short(m.approveTx)}</small></div>}
          </div>
          <div>
            {live && role === "client" && m.status === "created" && (
              <button disabled={busy} onClick={() => onAction("fund", i)}>Fund</button>
            )}
            {live && role === "freelancer" && m.status === "funded" && (
              <button disabled={busy} onClick={() => onAction("submit", i)}>Submit work</button>
            )}
            {live && role === "client" && m.status === "submitted" && (
              <button disabled={busy} onClick={() => onAction("approve", i)}>Approve &amp; pay</button>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}
