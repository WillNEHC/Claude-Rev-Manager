"use client";

import { useState } from "react";
import type { SearchAnswer } from "../../rag/types";

const EXAMPLES = [
  "What do families complain about on Squam Lake?",
  "What amenities generate repeat guests?",
  "What restaurants are mentioned most often by Lake Sunapee visitors?",
  "What amenities are trending upward?",
];

export default function SearchPage() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<SearchAnswer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function ask(q: string) {
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch("/api/search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await res.json();
      if (!res.ok) setError(data.error?.message ?? "Search failed");
      else setAnswer(data as SearchAnswer);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <h1>Ask the Corpus</h1>
      <p className="muted">Natural-language questions grounded in the collected reviews. Answers cite evidence and say so when they can&apos;t.</p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (question.trim().length >= 3) ask(question.trim());
        }}
      >
        <input
          type="text"
          value={question}
          placeholder="e.g. Why do guests choose Winnipesaukee over Newfound?"
          onChange={(e) => setQuestion(e.target.value)}
        />
        <div style={{ marginTop: "0.6rem" }}>
          <button type="submit" disabled={loading}>{loading ? "Thinking…" : "Ask"}</button>
        </div>
      </form>

      <div style={{ marginTop: "0.75rem" }} className="muted">
        Try:{" "}
        {EXAMPLES.map((ex) => (
          <a key={ex} href="#" onClick={(e) => { e.preventDefault(); setQuestion(ex); ask(ex); }} style={{ marginRight: "0.75rem" }}>
            {ex}
          </a>
        ))}
      </div>

      {error && <p className="lowconf">Error: {error}</p>}

      {answer && (
        <div className="answer">
          {answer.insufficientEvidence ? (
            <p className="lowconf"><strong>Insufficient evidence.</strong> {answer.answer}</p>
          ) : (
            <>
              <p>{answer.answer}</p>
              <p className="muted">
                Route: {answer.route} · Confidence: {(answer.confidence * 100).toFixed(0)}% · {answer.supportingCount} supporting
              </p>
              {answer.structured.length > 0 && (
                <ul>
                  {answer.structured.map((s, i) => (
                    <li key={i}><strong>{s.label}</strong>: {String(s.value)}{s.detail ? ` (${s.detail})` : ""}</li>
                  ))}
                </ul>
              )}
              {answer.citations.length > 0 && (
                <>
                  <h2>Evidence</h2>
                  {answer.citations.map((c, i) => (
                    <blockquote key={i} className="cite">“{c.excerpt}”</blockquote>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
