import "server-only";

import { env } from "@/lib/env";

/**
 * Minimal DeepSeek client. DeepSeek's API is OpenAI-compatible, so this is a
 * thin fetch wrapper rather than a dependency — one call site, one shape.
 *
 * Models (verified against the live /models endpoint): `deepseek-v4-flash`
 * (fast, cheap — the default here) and `deepseek-v4-pro`. Flash is the right
 * choice because the reasoning is already done in code; the model only narrates
 * pre-computed numbers.
 */

const BASE = "https://api.deepseek.com";

export interface DeepSeekMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface DeepSeekResult {
  content: string;
  model: string;
  finishReason: string | null;
  promptTokens: number | null;
  completionTokens: number | null;
}

export class InsufficientBalanceError extends Error {}

/**
 * Extract a JSON object from model output.
 *
 * v4-flash is a reasoning model — it can wrap the answer in prose or code
 * fences despite json_object mode. Slicing to the outermost braces survives
 * that; a bare JSON.parse does not, which was the "Json error".
 */
export function extractJson(raw: string): unknown {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No JSON object found in response.");
  }
  return JSON.parse(raw.slice(start, end + 1));
}

export async function deepseekJson(
  messages: DeepSeekMessage[],
  opts: { model?: string; maxTokens?: number; temperature?: number } = {},
): Promise<DeepSeekResult> {
  const model = opts.model ?? "deepseek-v4-flash";

  const res = await fetch(`${BASE}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      response_format: { type: "json_object" },
      // Low temperature: this is analysis, not creative writing. Keep it stable.
      temperature: opts.temperature ?? 0.3,
      // Generous headroom: v4-flash spends hidden reasoning_content tokens
      // before the JSON. Too small a cap truncates the answer to empty/invalid.
      max_tokens: opts.maxTokens ?? 3000,
    }),
    // Never cache an LLM response at the fetch layer — we cache in the DB by
    // input hash, which is the correct granularity.
    cache: "no-store",
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const message = body?.error?.message ?? `DeepSeek ${res.status}`;
    if (/insufficient balance/i.test(message)) {
      throw new InsufficientBalanceError(
        "The DeepSeek account has no balance. Add credit at platform.deepseek.com to generate analysis.",
      );
    }
    throw new Error(`DeepSeek error: ${message}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string }; finish_reason?: string }[];
    model?: string;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };

  const choice = json.choices?.[0];
  const content = choice?.message?.content;
  const finishReason = choice?.finish_reason ?? null;

  if (!content) {
    // Almost always means reasoning consumed the whole budget before any JSON.
    throw new Error(
      finishReason === "length"
        ? "The response was cut off before finishing. Try again."
        : "DeepSeek returned an empty response.",
    );
  }

  return {
    content,
    model: json.model ?? model,
    finishReason,
    promptTokens: json.usage?.prompt_tokens ?? null,
    completionTokens: json.usage?.completion_tokens ?? null,
  };
}
