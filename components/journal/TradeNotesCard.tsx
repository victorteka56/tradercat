"use client";

import { useRef, useState } from "react";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { saveTradeNote } from "@/app/(app)/journal/[id]/note-actions";

/**
 * Free-text trade journal note. Autosaves ~1s after you stop typing (and on
 * blur), so there's no save button to remember — the status line confirms it.
 */
export function TradeNotesCard({
  tradeId,
  initial,
}: {
  tradeId: string;
  initial: string;
}) {
  const [body, setBody] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">(
    "idle",
  );
  const savedValue = useRef(initial);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = async (value: string) => {
    if (value === savedValue.current) {
      setStatus("idle");
      return;
    }
    setStatus("saving");
    try {
      await saveTradeNote(tradeId, value);
      savedValue.current = value;
      setStatus("saved");
    } catch {
      setStatus("error");
    }
  };

  const onChange = (value: string) => {
    setBody(value);
    setStatus("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => commit(value), 1000);
  };

  const flush = () => {
    if (timer.current) clearTimeout(timer.current);
    commit(body);
  };

  return (
    <SurfaceCard className="mb-4 p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">Notes</span>
        <span className="text-[11px] text-ink-faint">
          {status === "saving"
            ? "Saving…"
            : status === "saved"
            ? "Saved"
            : status === "error"
            ? "Couldn't save"
            : ""}
        </span>
      </div>
      <textarea
        value={body}
        onChange={(e) => onChange(e.target.value)}
        onBlur={flush}
        placeholder="What was the setup? Why did you enter, and how did you manage it? Anything to repeat or avoid next time."
        rows={4}
        className="w-full resize-y rounded-xl border border-line bg-surface-2/40 p-3 text-[13px] leading-relaxed text-ink outline-none placeholder:text-ink-faint focus:border-info"
      />
    </SurfaceCard>
  );
}
