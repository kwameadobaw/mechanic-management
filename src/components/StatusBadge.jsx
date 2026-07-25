export default function StatusBadge({ status }) {
  if (status === "repaired") {
    return <span className="badge badge-repaired">Repaired</span>;
  }
  return <span className="badge badge-active">In progress</span>;
}
