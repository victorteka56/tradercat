"use client";

import Link from "next/link";
import { signUp } from "@/app/auth/actions";
import {
  Field,
  FormMessage,
  SubmitButton,
  useAuthForm,
} from "@/components/auth/AuthForm";

export default function SignupPage() {
  const [state, formAction] = useAuthForm(signUp);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-between px-6 pb-8 pt-16 lg:justify-center lg:gap-16">
      <div>
        <div className="mb-10">
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-[18px] font-bold text-white">
            T
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">
            Create your account
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            Import your trades and see what to review next.
          </p>
        </div>

        <form action={formAction} className="space-y-3">
          <Field
            label="Name"
            name="name"
            type="text"
            placeholder="Alex Trader"
            autoComplete="name"
          />
          <Field
            label="Email"
            name="email"
            type="email"
            placeholder="you@email.com"
            autoComplete="email"
          />
          <Field
            label="Password"
            name="password"
            type="password"
            placeholder="At least 8 characters"
            autoComplete="new-password"
          />

          <FormMessage state={state} />

          <div className="pt-2">
            <SubmitButton>Create account</SubmitButton>
          </div>
          <p className="pt-1 text-center text-[11px] leading-relaxed text-ink-faint">
            TraderCat provides educational analysis, not financial advice.
          </p>
        </form>
      </div>

      <p className="text-center text-[13px] text-ink-soft">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-info">
          Sign in
        </Link>
      </p>
    </main>
  );
}
