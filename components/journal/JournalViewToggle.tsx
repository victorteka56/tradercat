"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setJournalView, type JournalView } from "@/app/(app)/journal/view-actions";

/** Table / Calendar switch. Persists the choice, then re-renders the page. */
export function JournalViewToggle({ current }: { current: JournalView }) {
  const router = useRouter();
  const [pending, start] = useTransition();

  const choose = (view: JournalView) => {
    if (view === current || pending) return;
    start(async () => {
      await setJournalView(view);
      router.refresh();
    });
  };

  return (
    <div className="inline-flex rounded-full border border-line bg-surface p-0.5">
      {(
        [
          ["table", "Table", TableIcon],
          ["calendar", "Calendar", CalIcon],
        ] as const
      ).map(([v, label, Icon]) => {
        const active = current === v;
        return (
          <button
            key={v}
            onClick={() => choose(v)}
            disabled={pending}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-semibold transition-colors disabled:opacity-60 ${
              active ? "bg-ink text-white" : "text-ink-soft hover:text-ink"
            }`}
          >
            <Icon active={active} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function base(active: boolean) {
  return {
    width: 14,
    height: 14,
    fill: "none",
    stroke: active ? "#fff" : "var(--ink-soft)",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}
function TableIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...base(active)}>
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
function CalIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...base(active)}>
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M3 9h18M8 2v4M16 2v4" />
    </svg>
  );
}
