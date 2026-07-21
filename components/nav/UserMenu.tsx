"use client";

import { LogOut } from "lucide-react";
import { signOut } from "@/app/auth/actions";

export function UserMenu({
  displayName,
  email,
  collapsed = false,
}: {
  displayName: string | null;
  email: string;
  collapsed?: boolean;
}) {
  const label = displayName || email.split("@")[0] || "Account";
  const initial = label.charAt(0).toUpperCase();

  const avatar = (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-white">
      {initial}
    </div>
  );

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <div title={label}>{avatar}</div>
        <form action={signOut}>
          <button
            type="submit"
            title="Sign out"
            className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
          >
            <LogOut size={16} strokeWidth={2} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2">
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold text-ink">{label}</div>
        <div className="truncate text-[11px] text-ink-faint">{email}</div>
      </div>
      <form action={signOut}>
        <button
          type="submit"
          title="Sign out"
          className="rounded-lg p-1.5 text-ink-faint transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <LogOut size={16} strokeWidth={2} />
        </button>
      </form>
    </div>
  );
}
