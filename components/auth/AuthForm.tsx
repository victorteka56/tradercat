"use client";

import { useFormState, useFormStatus } from "react-dom";
import type { AuthState } from "@/app/auth/actions";

export function Field({
  label,
  name,
  type,
  placeholder,
  autoComplete,
}: {
  label: string;
  name: string;
  type: string;
  placeholder: string;
  autoComplete?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12px] font-semibold text-ink-soft">
        {label}
      </span>
      <input
        name={name}
        type={type}
        required
        autoComplete={autoComplete}
        placeholder={placeholder}
        className="h-12 w-full rounded-2xl border border-line bg-surface px-4 text-[15px] text-ink outline-none placeholder:text-ink-faint focus:border-info"
      />
    </label>
  );
}

export function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 w-full items-center justify-center rounded-full border border-transparent bg-ink px-5 text-[14px] font-semibold text-white transition-colors hover:bg-ink/90 disabled:opacity-50"
    >
      {pending ? "Just a moment…" : children}
    </button>
  );
}

export function FormMessage({ state }: { state: AuthState }) {
  if (state.error) {
    return (
      <p
        role="alert"
        className="rounded-xl border border-neg/20 bg-neg/10 px-3 py-2 text-[13px] text-neg"
      >
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p
        role="status"
        className="rounded-xl border border-pos/20 bg-pos/10 px-3 py-2 text-[13px] text-pos"
      >
        {state.message}
      </p>
    );
  }
  return null;
}

export function useAuthForm(
  action: (prev: AuthState, formData: FormData) => Promise<AuthState>,
) {
  return useFormState(action, {} as AuthState);
}
