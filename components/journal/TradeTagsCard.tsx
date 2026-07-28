"use client";

import { useMemo, useState } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { addTradeTag, removeTradeTag } from "@/app/(app)/journal/[id]/tag-actions";
import type { TagKind, TradeTag } from "@/lib/queries/journal";

/**
 * Setup / mistake / emotion tags for a trade.
 *
 * This is where a journal earns its keep: tags turn a pile of trades into
 * answerable questions — "does my breakout setup actually make money", "how
 * often does FOMO show up in my losers". The card offers a small starter
 * vocabulary per category (one tap) plus freeform, so a trader can label a
 * trade in seconds without inventing a taxonomy first.
 */

const KINDS: { key: TagKind; label: string; color: string; hint: string }[] = [
  { key: "setup", label: "Setup", color: "#3a5a9c", hint: "What was the play?" },
  { key: "mistake", label: "Mistake", color: "#bd4640", hint: "What went wrong?" },
  { key: "emotion", label: "Emotion", color: "#a3741a", hint: "How did you feel?" },
];

// A starter vocabulary — enough to tag fast, not so much it's a menu to read.
const PRESETS: Record<TagKind, string[]> = {
  setup: ["Breakout", "Pullback", "Reversal", "Trend", "Gap", "Earnings", "News"],
  mistake: ["FOMO", "Chased", "No stop", "Averaged down", "Oversized", "Early exit", "Revenge"],
  emotion: ["Confident", "Anxious", "Greedy", "Impatient", "Disciplined", "Bored"],
  custom: [],
};

const KIND_COLOR: Record<TagKind, string> = {
  setup: "#3a5a9c",
  mistake: "#bd4640",
  emotion: "#a3741a",
  custom: "#6d5b9e",
};

const alpha = (hex: string, a: number) =>
  hex + Math.round(a * 255).toString(16).padStart(2, "0");

export function TradeTagsCard({
  tradeId,
  initial,
}: {
  tradeId: string;
  initial: TradeTag[];
}) {
  const [tags, setTags] = useState<TradeTag[]>(initial);
  const [activeKind, setActiveKind] = useState<TagKind>("setup");
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const applied = useMemo(() => new Set(tags.map((t) => t.name.toLowerCase())), [tags]);

  const add = async (name: string, kind: TagKind) => {
    const clean = name.trim();
    if (!clean || applied.has(clean.toLowerCase())) return;
    setBusy(clean);
    // Optimistic — show it immediately, reconcile with the server's row.
    const optimistic: TradeTag = { id: `tmp-${clean}`, name: clean, kind };
    setTags((t) => [...t, optimistic]);
    setDraft("");
    try {
      const saved = await addTradeTag(tradeId, clean, kind);
      setTags((t) => t.map((x) => (x.id === optimistic.id ? saved : x)));
    } catch {
      setTags((t) => t.filter((x) => x.id !== optimistic.id));
    } finally {
      setBusy(null);
    }
  };

  const remove = async (tag: TradeTag) => {
    setTags((t) => t.filter((x) => x.id !== tag.id));
    try {
      await removeTradeTag(tradeId, tag.id);
    } catch {
      setTags((t) => [...t, tag]); // put it back on failure
    }
  };

  const presetsLeft = PRESETS[activeKind].filter((p) => !applied.has(p.toLowerCase()));

  return (
    <SurfaceCard className="mb-4 p-4">
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
          Tags
        </span>
        <span className="text-[11px] text-ink-faint">
          Label the setup, mistake &amp; emotion
        </span>
      </div>

      {/* Applied tags — removable chips, coloured by category. */}
      {tags.length > 0 ? (
        <div className="mb-3 flex flex-wrap gap-1.5">
          {tags.map((t) => {
            const c = KIND_COLOR[t.kind];
            return (
              <button
                key={t.id}
                onClick={() => remove(t)}
                className="group inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-2 text-[12px] font-semibold transition-colors"
                style={{ background: alpha(c, 0.12), color: c }}
              >
                {t.name}
                <span className="text-[13px] leading-none opacity-50 transition-opacity group-hover:opacity-100">
                  ×
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="mb-3 text-[12.5px] leading-relaxed text-ink-soft">
          No tags yet. Tag a few trades and Analytics will show which setups make
          money and which mistakes cost you.
        </p>
      )}

      {/* Category switch */}
      <div className="mb-2 flex gap-1">
        {KINDS.map((k) => (
          <button
            key={k.key}
            onClick={() => setActiveKind(k.key)}
            className={`rounded-full px-2.5 py-1 text-[11.5px] font-semibold transition-colors ${
              activeKind === k.key ? "text-white" : "text-ink-soft hover:text-ink"
            }`}
            style={activeKind === k.key ? { background: k.color } : undefined}
          >
            {k.label}
          </button>
        ))}
      </div>

      {/* Preset chips for the active category */}
      {presetsLeft.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {presetsLeft.map((p) => (
            <button
              key={p}
              disabled={busy === p}
              onClick={() => add(p, activeKind)}
              className="rounded-full border border-line bg-surface px-2.5 py-1 text-[12px] font-medium text-ink-soft transition-colors hover:border-ink/20 hover:text-ink disabled:opacity-50"
            >
              + {p}
            </button>
          ))}
        </div>
      )}

      {/* Freeform add */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          add(draft, activeKind);
        }}
        className="flex gap-2"
      >
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={40}
          placeholder={KINDS.find((k) => k.key === activeKind)?.hint ?? "Add a tag"}
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-1.5 text-[13px] text-ink outline-none placeholder:text-ink-faint focus:border-ink/25"
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-lg bg-ink px-3 py-1.5 text-[12.5px] font-semibold text-white transition-opacity hover:bg-ink/90 disabled:opacity-40"
        >
          Add
        </button>
      </form>
    </SurfaceCard>
  );
}
