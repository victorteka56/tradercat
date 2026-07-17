"use client";

import { signOut } from "@/app/auth/actions";

export function UserMenu({
  displayName,
  email,
}: {
  displayName: string | null;
  email: string;
}) {
  const label = displayName || email.split("@")[0] || "Account";
  const initial = label.charAt(0).toUpperCase();

  return (
    <div className="flex items-center gap-3 rounded-xl px-2 py-2">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-white">
        {initial}
      </div>
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
          <svg
            viewBox="0 0 24 24"
            width="16"
            height="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="m16 17 5-5-5-5M21 12H9" />
          </svg>
        </button>
      </form>
    </div>
  );
}
