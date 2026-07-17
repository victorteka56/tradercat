"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "@/app/auth/actions";
import {
  Field,
  FormMessage,
  SubmitButton,
  useAuthForm,
} from "@/components/auth/AuthForm";

function LoginForm() {
  const [state, formAction] = useAuthForm(signIn);
  // Middleware sets ?next=… when it bounces you off a protected route.
  const next = useSearchParams().get("next") ?? "/home";

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="next" value={next} />
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
        placeholder="••••••••"
        autoComplete="current-password"
      />

      <FormMessage state={state} />

      <div className="pt-2">
        <SubmitButton>Sign in</SubmitButton>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[440px] flex-col justify-between px-6 pb-8 pt-16 lg:justify-center lg:gap-16">
      <div>
        <div className="mb-10">
          <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-ink text-[18px] font-bold text-white">
            T
          </div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ink">
            Welcome back
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-soft">
            Your trading journal, ready to review.
          </p>
        </div>

        <Suspense fallback={<div className="h-[260px]" />}>
          <LoginForm />
        </Suspense>
      </div>

      <p className="text-center text-[13px] text-ink-soft">
        New here?{" "}
        <Link href="/signup" className="font-semibold text-info">
          Create an account
        </Link>
      </p>
    </main>
  );
}
