import type { Recommendation, TrendPoint, MarketInsight, Opportunity } from "../engines/types";

/**
 * Monthly report assembly (docs/09). Turns engine outputs into a structured
 * section tree — including a first-class confidence summary and an evidence
 * appendix — that the renderer and the API serve. Pure: no I/O, no LLM. (A
 * synthesis model may later rewrite the prose sections; the structure is here.)
 */

export interface ReportInput {
  reportMonth: string;
  marketName: string;
  recommendations: Recommendation[];
  trends: TrendPoint[];
  opportunities: Opportunity[];
  insights: MarketInsight[];
  reviewsAnalyzed: number;
}

export interface ReportSection {
  id: string;
  title: string;
  body: string;
  items?: { label: string; detail?: string }[];
}

export interface MonthlyReport {
  reportMonth: string;
  marketName: string;
  title: string;
  executiveSummary: string;
  sections: ReportSection[];
  confidenceSummary: {
    reviewsAnalyzed: number;
    recommendationCount: number;
    lowConfidenceCount: number;
    note: string;
  };
  appendix: { subject: string; excerpts: string[] }[];
}

const TOP_RECS = 25;

export function assembleReport(input: ReportInput): MonthlyReport {
  const active = input.recommendations
    .filter((r) => r.changeType !== "retired")
    .sort((a, b) => b.priorityScore - a.priorityScore);
  const top = active.slice(0, TOP_RECS);
  const lowConfidenceCount = top.filter((r) => r.confidence < 0.5).length;

  const risingAmenities = input.trends
    .filter((t) => t.entityType === "amenity" && t.direction === "up")
    .sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0));
  const risingComplaints = input.trends
    .filter((t) => t.metricKey.includes("negative_rate") && t.direction === "up")
    .sort((a, b) => (b.deltaPct ?? 0) - (a.deltaPct ?? 0));

  const sections: ReportSection[] = [
    {
      id: "top-trends",
      title: "Top Trends",
      body: `${risingAmenities.length} amenity signals rising, ${risingComplaints.length} complaint signals rising this period.`,
      items: risingAmenities.slice(0, 8).map((t) => ({
        label: t.metricKey,
        detail: `${fmtPct(t.deltaPct)} (n=${t.sampleSize})`,
      })),
    },
    {
      id: "top-opportunities",
      title: "Top Opportunities",
      body: `${input.opportunities.length} gaps detected.`,
      items: input.opportunities
        .sort((a, b) => (b.expectedReviewImpact ?? 0) - (a.expectedReviewImpact ?? 0))
        .slice(0, 10)
        .map((o) => ({ label: o.title, detail: `${o.supportingReviewCount} reviews, conf ${o.confidence}` })),
    },
    {
      id: "market-comparison",
      title: "Market Comparison",
      body: "Per-market strengths and pain points.",
      items: input.insights.map((i) => ({ label: i.title, detail: i.summary })),
    },
    {
      id: "complaint-trends",
      title: "Complaint Trends",
      body: `${risingComplaints.length} complaint categories trending up.`,
      items: risingComplaints.slice(0, 8).map((t) => ({ label: t.metricKey, detail: fmtPct(t.deltaPct) })),
    },
    {
      id: "recommendations",
      title: `Top ${top.length} Recommendations`,
      body: "Ranked by priority. Each carries evidence in the appendix.",
      items: top.map((r) => ({
        label: `${r.title} — ${r.changeType}`,
        detail: `priority ${r.priorityScore}, ${r.roiClass} ROI, conf ${r.confidence}, ${r.supportingReviewCount} reviews`,
      })),
    },
    {
      id: "operational-watch-list",
      title: "Operational Watch List",
      body: "Issues to monitor before they dent ratings.",
      items: input.opportunities
        .filter((o) => o.gapType === "operational")
        .map((o) => ({ label: o.title, detail: `${o.supportingReviewCount} reviews` })),
    },
  ];

  const appendix = top
    .filter((r) => r.evidence.length > 0)
    .map((r) => ({ subject: r.title, excerpts: r.evidence.map((e) => e.excerpt) }));

  return {
    reportMonth: input.reportMonth,
    marketName: input.marketName,
    title: `${input.marketName} — Guest Demand Intelligence, ${input.reportMonth}`,
    executiveSummary: buildExecutiveSummary(input, top, risingAmenities.length, risingComplaints.length),
    sections,
    confidenceSummary: {
      reviewsAnalyzed: input.reviewsAnalyzed,
      recommendationCount: top.length,
      lowConfidenceCount,
      note:
        lowConfidenceCount > 0
          ? `${lowConfidenceCount} of ${top.length} recommendations are low-confidence and flagged as such.`
          : "All surfaced recommendations meet the confidence bar.",
    },
    appendix,
  };
}

function buildExecutiveSummary(
  input: ReportInput,
  top: Recommendation[],
  risingAmenities: number,
  risingComplaints: number,
): string {
  if (top.length === 0) {
    return `This period analyzed ${input.reviewsAnalyzed} reviews for ${input.marketName}. Not enough signal yet to surface recommendations — evidence will strengthen as more reviews accumulate.`;
  }
  const lead = top[0]!;
  return [
    `Across ${input.reviewsAnalyzed} reviews for ${input.marketName}, GDIP surfaced ${top.length} recommendations this period.`,
    `The highest-priority action is "${lead.title}" (${lead.roiClass} ROI, ${lead.supportingReviewCount} supporting reviews).`,
    `${risingAmenities} amenity signals and ${risingComplaints} complaint signals are trending up.`,
  ].join(" ");
}

function fmtPct(p: number | null): string {
  return p === null ? "n/a" : `${(p * 100).toFixed(0)}%`;
}
