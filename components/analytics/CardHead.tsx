import Link from "next/link";

/**
 * Shared chart-card header. Pass `href` to add a "→" drill-down affordance that
 * opens the dimension's own detail page.
 */
export function CardHead({
  title,
  question,
  href,
}: {
  title: string;
  question?: string;
  href?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-[13px] font-semibold text-ink">{title}</div>
        {question && <div className="mt-0.5 text-[11.5px] text-ink-faint">{question}</div>}
      </div>
      {href && (
        <Link
          href={href}
          aria-label={`More on ${title}`}
          className="-mr-1 -mt-1 shrink-0 rounded-full p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </Link>
      )}
    </div>
  );
}
