"use client";

import { useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { SurfaceCard } from "@/components/ui/SurfaceCard";
import { importCsv, type ImportState } from "./actions";

function Submit({ fileName }: { fileName: string | null }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || !fileName}
      className="inline-flex h-11 w-full items-center justify-center rounded-full bg-ink px-5 text-[14px] font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-40"
    >
      {pending
        ? "Processing… this can take a moment"
        : fileName
        ? `Import ${fileName}`
        : "Choose a file first"}
    </button>
  );
}

export function ImportForm() {
  const [state, formAction] = useFormState(importCsv, {} as ImportState);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const setFile = (files: FileList | null) => {
    const f = files?.[0];
    if (!f) return;
    if (fileRef.current) fileRef.current.files = files;
    setFileName(f.name);
  };

  return (
    <form action={formAction} className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        name="file"
        accept=".csv,text/csv"
        className="hidden"
        onChange={(e) => setFile(e.target.files)}
      />

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          setFile(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-card border-2 border-dashed px-6 py-12 text-center transition-colors ${
          dragging
            ? "border-info bg-info/5"
            : fileName
            ? "border-info/40 bg-surface"
            : "border-line bg-surface hover:bg-surface-2"
        }`}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-2">
          <svg
            viewBox="0 0 24 24"
            width="22"
            height="22"
            fill="none"
            stroke="var(--ink-soft)"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 16V4M7 9l5-5 5 5" />
            <path d="M5 16v3a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3" />
          </svg>
        </div>
        <div className="text-[15px] font-semibold text-ink">
          {fileName ?? "Upload activity CSV"}
        </div>
        <p className="mt-1 max-w-[280px] text-[13px] leading-relaxed text-ink-soft">
          {fileName
            ? "Ready to import. Choose a different file by tapping again."
            : "Drop your Robinhood account activity export here, or tap to choose a file."}
        </p>
      </div>

      <Submit fileName={fileName} />

      {state.error && (
        <p
          role="alert"
          className="rounded-xl border border-neg/20 bg-neg/10 px-3 py-2 text-[13px] text-neg"
        >
          {state.error}
        </p>
      )}

      {state.result && (
        <SurfaceCard className="p-4">
          <div className="text-[14px] font-semibold text-pos">
            Imported {state.result.fillsInserted.toLocaleString()} fills →{" "}
            {state.result.tradesUpserted.toLocaleString()} trades
          </div>
          <ul className="tnum mt-2 space-y-1 text-[12px] text-ink-soft">
            <li>{state.result.totalRows.toLocaleString()} rows read</li>
            {state.result.duplicatesSkipped > 0 && (
              <li>
                {state.result.duplicatesSkipped.toLocaleString()} already
                imported (skipped)
              </li>
            )}
            {state.result.rowErrors > 0 && (
              <li className="text-amber">
                {state.result.rowErrors.toLocaleString()} rows could not be read
              </li>
            )}
          </ul>
          <Link
            href="/journal"
            className="mt-3 inline-flex h-10 items-center justify-center rounded-full border border-line bg-surface px-4 text-[13px] font-semibold text-ink hover:bg-surface-2"
          >
            View journal →
          </Link>
        </SurfaceCard>
      )}
    </form>
  );
}
