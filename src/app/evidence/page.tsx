import { dashboardRepo } from "../lib/server";

export const dynamic = "force-dynamic";

/** Evidence browser: reverse lookup of the reviews behind any conclusion. */
export default async function EvidencePage({
  searchParams,
}: {
  searchParams: { subject_type?: string; subject_id?: string };
}) {
  const { subject_type, subject_id } = searchParams;
  if (!subject_type || !subject_id) {
    return (
      <>
        <h1>Evidence Browser</h1>
        <p className="muted">Open an evidence link from a recommendation or insight to see its supporting reviews.</p>
      </>
    );
  }
  const rows = await dashboardRepo().getEvidence(subject_type, subject_id);
  return (
    <>
      <h1>Evidence</h1>
      <p className="muted">{subject_type} · {rows.length} supporting excerpt{rows.length === 1 ? "" : "s"}</p>
      {rows.map((e, i) => (
        <blockquote key={i} className="cite">
          “{e.excerpt}”{e.reviewId ? <span className="muted"> — review {e.reviewId.slice(0, 8)}</span> : null}
        </blockquote>
      ))}
      {rows.length === 0 && <p className="muted">No evidence rows found for this subject.</p>}
    </>
  );
}
