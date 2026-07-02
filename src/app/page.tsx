import { dashboardRepo } from "./lib/server";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const data = await dashboardRepo().overview();
  return (
    <>
      <h1>Market Overview</h1>
      <p className="muted">All markets · evidence-first intelligence</p>

      <div className="stats">
        <div className="stat">
          <div className="n">{data.reviewCount.toLocaleString()}</div>
          <div className="l">Reviews analyzed</div>
        </div>
        <div className="stat">
          <div className="n">{data.recommendationCount}</div>
          <div className="l">Active recommendations</div>
        </div>
        <div className="stat">
          <div className="n">{data.risingSignals.length}</div>
          <div className="l">Rising signals</div>
        </div>
      </div>

      <h2>Top Recommendations</h2>
      <table>
        <thead>
          <tr><th>Recommendation</th><th>Priority</th><th>ROI</th><th>Confidence</th><th>Reviews</th></tr>
        </thead>
        <tbody>
          {data.topRecommendations.map((r) => (
            <tr key={r.id}>
              <td>{r.title}</td>
              <td>{r.priorityScore.toFixed(2)}</td>
              <td><span className="badge">{r.roiClass}</span></td>
              <td className={r.confidence < 0.5 ? "lowconf" : undefined}>{(r.confidence * 100).toFixed(0)}%</td>
              <td>{r.supportingReviewCount}</td>
            </tr>
          ))}
          {data.topRecommendations.length === 0 && (
            <tr><td colSpan={5} className="muted">No recommendations yet — run the monthly pipeline.</td></tr>
          )}
        </tbody>
      </table>

      <h2>Rising Signals</h2>
      <ul>
        {data.risingSignals.map((t, i) => (
          <li key={i}>{t.metricKey} <span className="muted">({t.deltaPct != null ? `${(t.deltaPct * 100).toFixed(0)}%` : "new"}, n={t.sampleSize})</span></li>
        ))}
        {data.risingSignals.length === 0 && <li className="muted">No rising signals this period.</li>}
      </ul>
    </>
  );
}
