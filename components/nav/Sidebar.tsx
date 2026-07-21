"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Home,
  NotebookText,
  ChartColumnBig,
  PieChart,
  Upload,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { UserMenu } from "./UserMenu";

const items = [
  { href: "/home", label: "Home", Icon: Home },
  { href: "/journal", label: "Journal", Icon: NotebookText },
  { href: "/analytics", label: "Analytics", Icon: ChartColumnBig },
  { href: "/portfolio", label: "Portfolio", Icon: PieChart },
  { href: "/import", label: "Import", Icon: Upload },
];

export function Sidebar({
  displayName,
  email,
}: {
  displayName: string | null;
  email: string;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (localStorage.getItem("tc-sidebar") === "1") setCollapsed(true);
  }, []);

  const toggle = () =>
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("tc-sidebar", next ? "1" : "0");
      return next;
    });

  return (
    <aside
      className={`sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-200 ease-out lg:flex ${
        collapsed ? "w-[68px]" : "w-60"
      }`}
    >
      <div
        className={`flex items-center gap-2.5 py-6 ${collapsed ? "justify-center px-0" : "px-5"}`}
      >
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-ink text-[16px] font-bold text-white">
          T
        </div>
        {!collapsed && (
          <span className="text-[16px] font-semibold tracking-tight text-ink">
            TraderCat
          </span>
        )}
      </div>

      <nav className={`flex-1 space-y-1 ${collapsed ? "px-2.5" : "px-3"}`}>
        {items.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={`flex items-center rounded-xl text-[14px] font-semibold transition-colors ${
                collapsed ? "justify-center py-2.5" : "gap-3 px-3 py-2.5"
              } ${
                active
                  ? "bg-ink text-white shadow-sm"
                  : "text-ink-soft hover:bg-surface-2 hover:text-ink"
              }`}
            >
              <Icon size={19} strokeWidth={2} className="shrink-0" />
              {!collapsed && label}
            </Link>
          );
        })}
      </nav>

      <div className={collapsed ? "px-2.5 pb-1" : "px-3 pb-1"}>
        <button
          onClick={toggle}
          title={collapsed ? "Expand" : "Collapse"}
          className={`flex w-full items-center rounded-xl py-2 text-[13px] font-semibold text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink ${
            collapsed ? "justify-center" : "gap-3 px-3"
          }`}
        >
          {collapsed ? (
            <PanelLeftOpen size={18} strokeWidth={2} />
          ) : (
            <>
              <PanelLeftClose size={18} strokeWidth={2} />
              Collapse
            </>
          )}
        </button>
      </div>

      <div className="border-t border-line p-3">
        <UserMenu displayName={displayName} email={email} collapsed={collapsed} />
      </div>
    </aside>
  );
}
