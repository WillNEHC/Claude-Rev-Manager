/**
 * Embeddings for RAG (docs/07). Reviews are chunked (long ones split) and each
 * chunk embedded into review_embeddings. The provider is injectable so chunking
 * is unit-tested without network; the default provider calls OpenAI's embeddings
 * endpoint. The vector dimension must match the pgvector column (default 1536).
 */

export interface EmbeddingProvider {
  readonly model: string;
  readonly dimension: number;
  embed(texts: string[]): Promise<number[][]>;
}

export interface TextChunk {
  index: number;
  content: string;
}

/**
 * Split text into chunks near `maxChars`, breaking on sentence/whitespace
 * boundaries where possible. Short reviews yield a single chunk.
 */
export function chunkText(text: string, maxChars = 1200): TextChunk[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [{ index: 0, content: clean }];

  const chunks: TextChunk[] = [];
  let start = 0;
  let index = 0;
  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);
    if (end < clean.length) {
      // Prefer a sentence boundary, then any whitespace, within the window.
      const window = clean.slice(start, end);
      const sentenceBreak = Math.max(
        window.lastIndexOf(". "),
        window.lastIndexOf("! "),
        window.lastIndexOf("? "),
      );
      const wsBreak = window.lastIndexOf(" ");
      const cut = sentenceBreak > maxChars * 0.5 ? sentenceBreak + 1 : wsBreak > 0 ? wsBreak : window.length;
      end = start + cut;
    }
    const content = clean.slice(start, end).trim();
    if (content) chunks.push({ index: index++, content });
    start = end;
  }
  return chunks;
}

export interface OpenAIEmbeddingOptions {
  apiKey: string;
  model?: string;
  dimension?: number;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

/** OpenAI embeddings provider (text-embedding-3-small by default). */
export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  readonly model: string;
  readonly dimension: number;
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: OpenAIEmbeddingOptions) {
    this.apiKey = opts.apiKey;
    this.model = opts.model ?? process.env.EMBEDDINGS_MODEL ?? "text-embedding-3-small";
    this.dimension = opts.dimension ?? 1536;
    this.baseUrl = (opts.baseUrl ?? "https://api.openai.com").replace(/\/$/, "");
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async embed(texts: string[]): Promise<number[][]> {
    if (texts.length === 0) return [];
    const res = await this.fetchImpl(`${this.baseUrl}/v1/embeddings`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, input: texts, dimensions: this.dimension }),
    });
    if (!res.ok) throw new Error(`embeddings ${res.status}: ${(await res.text()).slice(0, 200)}`);
    const json = (await res.json()) as { data: { index: number; embedding: number[] }[] };
    return json.data.sort((a, b) => a.index - b.index).map((d) => d.embedding);
  }
}
