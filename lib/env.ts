import { z } from "zod";

// Fail fast with a readable message instead of a cryptic driver error.
// Server-only — never import from a client component.

const missing = (name: string, hint: string) =>
  `not set. ${hint} (see .env.example → ${name})`;

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z
    .string({ error: missing("NEXT_PUBLIC_SUPABASE_URL", "Supabase → Project Settings → API → Project URL") })
    .refine((v) => /^https:\/\/.+\.supabase\.co/.test(v), {
      message: "must look like https://xxxxx.supabase.co",
    }),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string({ error: missing("NEXT_PUBLIC_SUPABASE_ANON_KEY", "Supabase → Project Settings → API → anon/publishable key") })
    .min(20, "looks too short to be a Supabase anon key"),
  DATABASE_URL: z
    .string({ error: missing("DATABASE_URL", "Supabase → Connect → transaction pooler (port 6543)") })
    .refine((v) => v.startsWith("postgres"), {
      message: "must be a postgres:// connection string",
    }),
  // Falls back to DATABASE_URL so the app boots before you add the direct URL;
  // drizzle-kit is the only thing that truly needs the 5432 connection.
  DIRECT_URL: z.string().optional(),

  // --- SnapTrade (server-only; never exposed to the client) ---
  SNAPTRADE_CLIENT_ID: z
    .string({ error: missing("SNAPTRADE_CLIENT_ID", "SnapTrade dashboard → API keys") })
    .min(1),
  SNAPTRADE_CONSUMER_KEY: z
    .string({ error: missing("SNAPTRADE_CONSUMER_KEY", "SnapTrade dashboard → API keys") })
    .min(1),

  /** Optional — trade-review narration. Absent = the AI feature is simply off. */
  DEEPSEEK_API_KEY: z.string().optional().default(""),

  /** 32 bytes, base64. Encrypts provider secrets at rest. */
  ENCRYPTION_KEY: z
    .string({
      error: missing(
        "ENCRYPTION_KEY",
        `generate with: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`,
      ),
    })
    .min(1),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_URL: process.env.DIRECT_URL,
  SNAPTRADE_CLIENT_ID: process.env.SNAPTRADE_CLIENT_ID,
  SNAPTRADE_CONSUMER_KEY: process.env.SNAPTRADE_CONSUMER_KEY,
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY,
});

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  throw new Error(
    `\n\nInvalid environment configuration:\n${issues}\n\n` +
      `Copy .env.example to .env.local and fill it in from your Supabase project.\n`,
  );
}

export const env = {
  ...parsed.data,
  DIRECT_URL: parsed.data.DIRECT_URL || parsed.data.DATABASE_URL,
};
