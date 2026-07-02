import type { RoutedQuestion, QuestionFilters, Route } from "./types";

/**
 * Lightweight question router (docs/07). Aggregation-shaped questions ("most
 * mentioned restaurants", "trending amenities") go to structured retrieval;
 * open-ended ones ("why do families...", "what creates...") go semantic; when
 * both signals fire, hybrid. Also lifts market/persona/category/place hints from
 * the text so retrieval can be scoped. Cheap and deterministic — no LLM needed
 * to route.
 */

const MARKET_HINTS: Record<string, string> = {
  winnipesaukee: "lake-winnipesaukee",
  winni: "lake-winnipesaukee",
  squam: "squam-lake",
  newfound: "newfound-lake",
  sunapee: "lake-sunapee",
};

const PERSONA_HINTS: Record<string, string> = {
  families: "families",
  family: "families",
  couples: "couples",
  "remote workers": "remote_workers",
  "remote work": "remote_workers",
  "pet owners": "pet_owners",
  pets: "pet_owners",
  "wedding": "wedding_guests",
  fishing: "fishing_groups",
  boating: "boating_groups",
};

const CATEGORY_HINTS: Record<string, string> = {
  cleanliness: "cleanliness",
  clean: "cleanliness",
  wifi: "technology",
  internet: "technology",
  parking: "parking",
  communication: "communication",
  location: "location",
  value: "value",
};

const PLACE_HINTS: Record<string, string> = {
  restaurant: "restaurant",
  restaurants: "restaurant",
  dining: "restaurant",
  brewery: "brewery",
  breweries: "brewery",
  coffee: "coffee",
  attraction: "attraction",
  attractions: "attraction",
};

// Words that signal an aggregation/ranking answer (structured retrieval).
const STRUCTURED_SIGNALS = [
  "most", "top", "trending", "trend", "how many", "which amenities",
  "ranked", "highest", "lowest", "count", "compare", "vs ", "versus",
  "mentioned most", "rising", "declining",
];

// Words that signal open-ended reasoning (semantic retrieval).
const SEMANTIC_SIGNALS = [
  "why", "what do", "what causes", "what creates", "how do", "complain",
  "love", "feel", "experience", "wish", "reasons", "care about",
];

export function classifyQuestion(question: string): RoutedQuestion {
  const q = question.toLowerCase();
  const filters: QuestionFilters = {};

  for (const [k, v] of Object.entries(MARKET_HINTS)) if (q.includes(k)) filters.marketSlug = v;
  for (const [k, v] of Object.entries(PERSONA_HINTS)) if (q.includes(k)) filters.personaSlug = v;
  for (const [k, v] of Object.entries(CATEGORY_HINTS)) if (q.includes(k)) filters.categorySlug = v;
  for (const [k, v] of Object.entries(PLACE_HINTS)) if (q.includes(k)) filters.placeType = v;
  if (/(rising|increasing|trending up|upward)/.test(q)) filters.direction = "up";
  else if (/(declining|falling|decreasing|trending down|downward)/.test(q)) filters.direction = "down";

  const structured = STRUCTURED_SIGNALS.some((s) => q.includes(s));
  const semantic = SEMANTIC_SIGNALS.some((s) => q.includes(s));

  let route: Route;
  if (structured && semantic) route = "hybrid";
  else if (structured) route = "structured";
  else if (semantic) route = "semantic";
  else route = "hybrid"; // ambiguous → run both, let synthesis reconcile

  return { route, filters };
}
