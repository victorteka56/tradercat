"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, NotebookText, ChartColumnBig, PieChart } from "lucide-react";

const tabs = [
  { href: "/home", label: "Home", Icon: Home },
  { href: "/journal", label: "Journal", Icon: NotebookText },
  { href: "/analytics", label: "Analytics", Icon: ChartColumnBig },
  { href: "/portfolio", label: "Portfolio", Icon: PieChart },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto max-w-[440px] border-t border-line bg-surface/95 backdrop-blur lg:hidden">
      <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-2">
        {tabs.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center gap-1 rounded-xl py-1.5"
            >
              <Icon
                size={22}
                strokeWidth={active ? 2.3 : 2}
                className={active ? "text-ink" : "text-ink-faint"}
              />
              <span
                className={`text-[10px] font-semibold ${
                  active ? "text-ink" : "text-ink-faint"
                }`}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
