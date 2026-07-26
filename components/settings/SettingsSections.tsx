"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import {
  updateDisplayName,
  updateTimezone,
  exportData,
  deleteAllData,
} from "@/app/(app)/settings/actions";

/** The account name, editable inline with autosave-on-submit. */
export function ProfileSection({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const router = useRouter();

  const save = async () => {
    setStatus("saving");
    try {
      await updateDisplayName(name);
      setStatus("saved");
      router.refresh();
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
    }
  };

  return (
    <SurfaceCard className="p-5">
      <h2 className="text-[14px] font-semibold text-ink">Profile</h2>
      <p className="mb-3 mt-0.5 text-[12px] text-ink-soft">The name shown across the app.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
        className="flex gap-2"
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={80}
          placeholder="Display name"
          className="min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none placeholder:text-ink-faint focus:border-ink/25"
        />
        <button
          type="submit"
          disabled={status === "saving" || name.trim() === initialName.trim()}
          className="rounded-lg bg-ink px-4 py-2 text-[13px] font-semibold text-white hover:bg-ink/90 disabled:opacity-40"
        >
          {status === "saving" ? "Saving…" : status === "saved" ? "Saved" : "Save"}
        </button>
      </form>
      {status === "error" && <p className="mt-2 text-[11.5px] text-neg">Couldn&apos;t save.</p>}
    </SurfaceCard>
  );
}

const TIMEZONES = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Phoenix",
  "America/Anchorage",
  "Pacific/Honolulu",
  "Europe/London",
  "UTC",
];

/** Account timezone — drives the session and day-of-week analytics. */
export function TimezoneSection({ initial }: { initial: string }) {
  const [tz, setTz] = useState(initial);
  const [saving, setSaving] = useState(false);
  const router = useRouter();

  const change = async (value: string) => {
    setTz(value);
    setSaving(true);
    try {
      await updateTimezone(value);
      router.refresh();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SurfaceCard className="p-5">
      <h2 className="text-[14px] font-semibold text-ink">Timezone</h2>
      <p className="mb-3 mt-0.5 text-[12px] text-ink-soft">
        Used for the time-of-day and day-of-week breakdowns.
      </p>
      <select
        value={tz}
        onChange={(e) => change(e.target.value)}
        disabled={saving}
        className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-ink/25"
      >
        {TIMEZONES.map((z) => (
          <option key={z} value={z}>
            {z.replace(/_/g, " ")}
          </option>
        ))}
      </select>
    </SurfaceCard>
  );
}

/** Portability — download everything as JSON. */
export function ExportSection() {
  const [busy, setBusy] = useState(false);

  const download = async () => {
    setBusy(true);
    try {
      const { filename, json } = await exportData();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SurfaceCard className="p-5">
      <h2 className="text-[14px] font-semibold text-ink">Export your data</h2>
      <p className="mb-3 mt-0.5 text-[12px] leading-relaxed text-ink-soft">
        Download every trade as JSON — yours to keep, move, or back up.
      </p>
      <button
        onClick={download}
        disabled={busy}
        className="rounded-lg border border-line bg-surface px-4 py-2 text-[13px] font-semibold text-ink hover:border-ink/25 disabled:opacity-50"
      >
        {busy ? "Preparing…" : "Download JSON"}
      </button>
    </SurfaceCard>
  );
}

/** Irreversible data deletion, gated by a typed confirmation. */
export function DangerSection() {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAllData(confirm);
      // Data gone + signed out — send them to login.
      router.push("/login");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't delete.");
      setBusy(false);
    }
  };

  return (
    <SurfaceCard className="border-neg/25 p-5">
      <h2 className="text-[14px] font-semibold text-neg">Delete all data</h2>
      <p className="mb-3 mt-0.5 text-[12px] leading-relaxed text-ink-soft">
        Permanently removes every trade, import, note, tag and brokerage
        connection. This can&apos;t be undone. Export first if you want a copy.
      </p>

      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="rounded-lg border border-neg/30 bg-neg/5 px-4 py-2 text-[13px] font-semibold text-neg hover:bg-neg/10"
        >
          Delete everything
        </button>
      ) : (
        <div className="space-y-2.5">
          <p className="text-[12.5px] font-medium text-ink">
            Type <span className="font-bold">DELETE</span> to confirm.
          </p>
          <input
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="DELETE"
            className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-[13.5px] text-ink outline-none focus:border-neg/40"
          />
          <div className="flex gap-2">
            <button
              onClick={remove}
              disabled={busy || confirm.trim().toUpperCase() !== "DELETE"}
              className="rounded-lg bg-neg px-4 py-2 text-[13px] font-semibold text-white hover:bg-neg/90 disabled:opacity-40"
            >
              {busy ? "Deleting…" : "Permanently delete"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setConfirm("");
                setError(null);
              }}
              disabled={busy}
              className="rounded-lg border border-line px-4 py-2 text-[13px] font-semibold text-ink-soft hover:text-ink"
            >
              Cancel
            </button>
          </div>
          {error && <p className="text-[11.5px] text-neg">{error}</p>}
        </div>
      )}
    </SurfaceCard>
  );
}
