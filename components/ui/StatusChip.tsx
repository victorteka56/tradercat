const toneMap = {
  neutral: "bg-surface-2 text-ink-soft border-line",
  info: "bg-info/10 text-info border-info/20",
  pos: "bg-pos/10 text-pos border-pos/20",
  neg: "bg-neg/10 text-neg border-neg/20",
  amber: "bg-amber/10 text-amber border-amber/20",
} as const;

export function StatusChip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: keyof typeof toneMap;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${toneMap[tone]}`}
    >
      {children}
    </span>
  );
}
