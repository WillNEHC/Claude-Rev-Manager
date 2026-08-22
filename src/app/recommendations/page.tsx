import { dashboardRepo } from "../lib/server";

export const dynamic = "force-dynamic";

export default async function RecommendationsPage({
  searchParams,
}: {
  searchParams: { market?: string };
}) {
  const recs = await dashboardRepo().listRecommendations({
    marketSlug: searchParams.market,
    sort: "priority",
    limit: 25,
  });
  return (
    <>
      <h1>Recommendations</h1>
      <p className="muted">Top 25 by priority. Every row is evidence-backed — open the evidence link to see the reviews behind it.</p>
      <table>
        <thead>
          <tr><th>Title</th><th>Priority</th><th>ROI</th><th>Confidence</th><th>Reviews</th><th>Evidence</th></tr>
        </thead>
        <tbody>
          {recs.map((r) => (
            <tr key={r.id}>
              <td>{r.title}</td>
              <td>{r.priorityScore.toFixed(2)}</td>
              <td><span className="badge">{r.roiClass}</span></td>
              <td className={r.confidence < 0.5 ? "lowconf" : undefined}>{(r.confidence * 100).toFixed(0)}%</td>
              <td>{r.supportingReviewCount}</td>
              <td><a href={`/evidence?subject_type=recommendation&subject_id=${r.id}`}>view</a></td>
            </tr>
          ))}
          {recs.length === 0 && <tr><td colSpan={6} className="muted">No recommendations yet.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
