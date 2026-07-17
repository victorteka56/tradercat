"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/home", label: "Home", icon: HomeIcon },
  { href: "/journal", label: "Journal", icon: JournalIcon },
  { href: "/analytics", label: "Analytics", icon: ChartIcon },
  { href: "/portfolio", label: "Portfolio", icon: PieIcon },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[440px] border-t border-line bg-surface/95 backdrop-blur lg:hidden">
      <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {tabs.map((t) => {
          const active =
            pathname === t.href || pathname.startsWith(t.href + "/");
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5"
            >
              <Icon active={active} />
              <span
                className={`text-[10px] font-semibold ${
                  active ? "text-ink" : "text-ink-faint"
                }`}
              >
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function base(active: boolean) {
  return {
    width: 22,
    height: 22,
    fill: "none",
    stroke: active ? "var(--ink)" : "var(--ink-faint)",
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
