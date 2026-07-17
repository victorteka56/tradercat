"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "./UserMenu";

const items = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/journal", label: "Journal", icon: JournalIcon },
  { href: "/analytics", label: "Analytics", icon: ChartIcon },
  { href: "/portfolio", label: "Portfolio", icon: PieIcon },
  { href: "/import", label: "Import", icon: UploadIcon },
];

export function Sidebar({
  displayName,
  email,
}: {
  displayName: string | null;
  email: string;
}) {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-line bg-surface lg:flex">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-[16px] font-bold text-white">
          T
        </div>
        <span className="text-[16px] font-semibold tracking-tight text-ink">
          TraderCat
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {items.map((it) => {
          const active =
            pathname === it.href || pathname.startsWith(it.href + "/");
          const Icon = it.icon;
          return (
            <Link
              key={it.href}
              href={it.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] font-semibold transition-colors ${
                active
                  ? "bg-surface-2 text-ink"
                  : "text-ink-soft hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon active={active} />
              {it.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-3">
        <UserMenu displayName={displayName} email={email} />
      </div>
    </aside>
  );
}

function base(active: boolean) {
  return {
    width: 20,
    height: 20,
    fill: "none",
    stroke: active ? "var(--ink)" : "var(--ink-soft)",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
}
function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...base(active)}>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
    </svg>
  );
}
function JournalIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...base(active)}>
      <path d="M5 4h11a2 2 0 0 1 2 2v14H7a2 2 0 0 1-2-2V4Z" />
      <path d="M9 8h6M9 12h6M9 16h3" />
    </svg>
  );
}
function ChartIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...base(active)}>
      <path d="M4 20V4M4 20h16" />
      <path d="M8 16v-4M12 16V8M16 16v-6" />
    </svg>
  );
}
function PieIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...base(active)}>
      <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" />
      <path d="M14 3.5A9 9 0 0 1 20.5 10H14V3.5Z" />
    </svg>
  );
}
function UploadIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" {...base(active)}>
      <path d="M12 15V4M8 8l4-4 4 4" />
      <path d="M5 15v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" />
    </svg>
  );
}
