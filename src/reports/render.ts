import type { MonthlyReport } from "./generate";

/**
 * Render a MonthlyReport to standalone, self-contained HTML (docs/09). No
 * external assets, so it works as an email body, a shareable file, or the source
 * for a PDF. All dynamic text is HTML-escaped.
 */
export function renderHtml(report: MonthlyReport): string {
  const sections = report.sections
    .map(
      (s) => `
    <section>
      <h2>${esc(s.title)}</h2>
      <p>${esc(s.body)}</p>
      ${s.items && s.items.length
        ? `<ul>${s.items
            .map((i) => `<li><strong>${esc(i.label)}</strong>${i.detail ? ` — ${esc(i.detail)}` : ""}</li>`)
            .join("")}</ul>`
        : ""}
    </section>`,
    )
    .join("");

  const appendix = report.appendix.length
    ? `<section><h2>Appendix — Supporting Evidence</h2>${report.appendix
        .map(
          (a) =>
            `<div class="ev"><h3>${esc(a.subject)}</h3><ul>${a.excerpts
              .map((e) => `<li>“${esc(e)}”</li>`)
              .join("")}</ul></div>`,
        )
        .join("")}</section>`
    : "";

  const cs = report.confidenceSummary;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(report.title)}</title>
<style>
  body{font:16px/1.5 -apple-system,Segoe UI,Roboto,sans-serif;color:#1a1a1a;max-width:820px;margin:2rem auto;padding:0 1rem}
  h1{font-size:1.6rem;margin-bottom:.25rem} h2{font-size:1.2rem;border-bottom:1px solid #e5e5e5;padding-bottom:.25rem;margin-top:2rem}
  .muted{color:#666} .summary{background:#f6f8fa;border:1px solid #e5e5e5;border-radius:8px;padding:1rem;margin:1rem 0}
  .ev{margin:.75rem 0} .ev li{color:#444} ul{padding-left:1.2rem}
</style></head><body>
  <h1>${esc(report.title)}</h1>
  <p class="muted">${esc(report.marketName)} · ${esc(report.reportMonth)}</p>
  <section><h2>Executive Summary</h2><p>${esc(report.executiveSummary)}</p></section>
  <div class="summary"><strong>Confidence:</strong> ${esc(cs.note)}
    <span class="muted">(${cs.reviewsAnalyzed} reviews analyzed, ${cs.recommendationCount} recommendations)</span></div>
  ${sections}
  ${appendix}
</body></html>`;
}

export function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
