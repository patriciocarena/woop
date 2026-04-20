import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { CoachContext } from "@/lib/ai/build-context";

export const runtime = "nodejs";

const MODEL = "claude-haiku-4-5";

// Frozen system prompt — no timestamps, no per-request data. Gets cached.
const SYSTEM_PROMPT = `You are the daily coach inside Woop, a self-hosted Whoop clone.

The user logs sleep, morning HRV/RHR (recovery), workouts (strain 0-21 Borg), and daily behaviors (caffeine, alcohol, screen time, meditation, …). You receive a JSON snapshot of their last 30 days and must produce a short, practical briefing for *today*.

Style:
- Direct, warm, concise. No hype, no emoji, no preamble.
- Address the user as "you".
- Speak in the language hint provided in the user message (es or en). Default to English.

Output JSON exactly matching this shape — no prose, no markdown fence:
{
  "headline": "one short sentence summarizing today's readiness (max 80 chars)",
  "recommendations": [
    { "title": "Short imperative (max 40 chars)", "detail": "One sentence explaining why, grounded in the data." }
  ],
  "strainTarget": "One sentence suggesting today's strain target, or null if insufficient data"
}

Rules:
- 1 to 3 recommendations. Prefer 2.
- Ground each recommendation in a *specific* number from the snapshot (e.g. "recovery 42%", "3 nights below 6h").
- If recovery is red, emphasize rest / sleep hygiene, not training.
- If a negative behavior correlation is strong (medium/high confidence), call it out.
- If data is too sparse (no recovery, no sleep), say so in headline and give one recommendation to log more.
- Never invent numbers. If a field is null, don't reference it.`;

type RequestBody = { context: CoachContext; lang?: "es" | "en" };

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_api_key", message: "Set ANTHROPIC_API_KEY in .env.local" },
      { status: 503 },
    );
  }

  let body: RequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (!body?.context || typeof body.context !== "object") {
    return NextResponse.json({ error: "missing_context" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });
  const lang = body.lang === "es" ? "es" : "en";

  try {
    const resp = await client.messages.create({
      model: MODEL,
      max_tokens: 600,
      system: [
        {
          type: "text",
          text: SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        {
          role: "user",
          content: `Language: ${lang}\n\nSnapshot:\n${JSON.stringify(body.context, null, 2)}`,
        },
      ],
    });

    const text = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");

    const parsed = safeParse(text);
    if (!parsed) {
      return NextResponse.json(
        { error: "bad_model_output", raw: text },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ...parsed,
      usage: {
        inputTokens: resp.usage.input_tokens,
        outputTokens: resp.usage.output_tokens,
        cacheCreate: resp.usage.cache_creation_input_tokens ?? 0,
        cacheRead: resp.usage.cache_read_input_tokens ?? 0,
      },
    });
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: "rate_limited" }, { status: 429 });
    }
    if (err instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: "auth_failed" }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : "unknown";
    return NextResponse.json({ error: "upstream", message }, { status: 502 });
  }
}

function safeParse(text: string): {
  headline: string;
  recommendations: { title: string; detail: string }[];
  strainTarget: string | null;
} | null {
  const cleaned = text.trim().replace(/^```json\s*/i, "").replace(/```$/i, "").trim();
  try {
    const obj = JSON.parse(cleaned);
    if (typeof obj.headline !== "string") return null;
    if (!Array.isArray(obj.recommendations)) return null;
    return {
      headline: obj.headline,
      recommendations: obj.recommendations
        .filter((r: unknown): r is { title: string; detail: string } => {
          return !!r && typeof r === "object"
            && typeof (r as { title: unknown }).title === "string"
            && typeof (r as { detail: unknown }).detail === "string";
        })
        .slice(0, 3),
      strainTarget: typeof obj.strainTarget === "string" ? obj.strainTarget : null,
    };
  } catch {
    return null;
  }
}
