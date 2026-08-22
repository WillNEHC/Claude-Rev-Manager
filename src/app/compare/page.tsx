import { dashboardRepo } from "../lib/server";

export const dynamic = "force-dynamic";

export default async function ComparePage() {
  const insights = await dashboardRepo().compareMarkets();
  return (
    <>
      <h1>Market Comparison</h1>
      <p className="muted">Strengths and pain points across the four lakes.</p>
      <table>
        <thead>
          <tr><th>Market</th><th>Profile</th><th>Confidence</th><th>Evidence</th></tr>
        </thead>
        <tbody>
          {insights.map((i, idx) => (
            <tr key={idx}>
              <td>{i.marketSlug}</td>
              <td>{i.summary}</td>
              <td>{(i.confidence * 100).toFixed(0)}%</td>
              <td><a href={`/evidence?subject_type=market_insight&subject_id=${i.evidenceRef.subjectId}`}>view</a></td>
            </tr>
          ))}
          {insights.length === 0 && <tr><td colSpan={4} className="muted">No market insights yet.</td></tr>}
        </tbody>
      </table>
    </>
  );
}
