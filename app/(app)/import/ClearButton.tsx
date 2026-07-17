"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { clearImports } from "./actions";

function Confirm() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-9 rounded-full border border-neg/30 bg-neg/10 px-3 text-[12px] font-semibold text-neg disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Yes, delete everything"}
    </button>
  );
}

export function ClearButton() {
  const [armed, setArmed] = useState(false);

  if (!armed) {
    return (
      <button
        onClick={() => setArmed(true)}
        className="text-[12px] font-semibold text-ink-faint hover:text-neg"
      >
        Clear imported data
      </button>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[12px] text-ink-soft">
        This deletes every imported fill and trade. It can&apos;t be undone.
      </p>
      <div className="flex items-center gap-2">
        <form action={clearImports}>
          <Confirm />
        </form>
        <button
          onClick={() => setArmed(false)}
          className="h-9 rounded-full border border-line px-3 text-[12px] font-semibold text-ink-soft"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
