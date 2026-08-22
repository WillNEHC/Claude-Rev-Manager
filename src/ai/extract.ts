import Anthropic from "@anthropic-ai/sdk";
import { buildSystemPrompt, buildUserPrompt, type ExtractionInput } from "./prompt";

/**
 * The LLM extraction boundary. `LlmExtractor` returns the model's raw parsed
 * JSON; validation (Zod) and quarantine happen downstream in the pipeline, so
 * this interface can be faked in tests without any network or API key.
 */
export interface LlmExtractor {
  readonly model: string;
  extractRaw(input: ExtractionInput): Promise<unknown>;
}

export interface AnthropicExtractorOptions {
  apiKey: string;
  model?: string;
  maxTokens?: number;
  client?: Anthropic;
}

/**
 * Anthropic-backed extractor. Uses a cheap model (Haiku by default; see the cost
 * model in docs/12) and asks for a single JSON object. The system prompt is a
 * stable cacheable prefix. Returns raw JSON; the pipeline validates + quarantines.
 */
export class AnthropicExtractor implements LlmExtractor {
  readonly model: string;
  private readonly client: Anthropic;
  private readonly maxTokens: number;
  private readonly system: string;

  constructor(opts: AnthropicExtractorOptions) {
    this.client = opts.client ?? new Anthropic({ apiKey: opts.apiKey });
    this.model = opts.model ?? process.env.GDIP_EXTRACTION_MODEL ?? "claude-haiku-4-5";
    this.maxTokens = opts.maxTokens ?? 2048;
    this.system = buildSystemPrompt();
  }

  async extractRaw(input: ExtractionInput): Promise<unknown> {
    const res = await this.client.messages.create({
      model: this.model,
      max_tokens: this.maxTokens,
      system: [{ type: "text", text: this.system, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: buildUserPrompt(input) }],
    });
    const text = res.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return parseJsonLoose(text);
  }
}

/**
 * Parse a JSON object from model text, tolerating stray prose or code fences.
 * Throws on genuinely unparseable output (caught by the pipeline -> quarantine).
 */
export function parseJsonLoose(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // Fall back to the outermost {...} span.
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    throw new Error("model output was not valid JSON");
  }
}
