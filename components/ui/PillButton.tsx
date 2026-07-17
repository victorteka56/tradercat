import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-ink text-white hover:bg-ink/90 border-transparent",
  secondary: "bg-surface text-ink border-line hover:bg-surface-2",
  ghost: "bg-transparent text-ink-soft border-transparent hover:bg-surface-2",
};

export function PillButton({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`inline-flex h-11 w-full items-center justify-center rounded-full border px-5 text-[14px] font-semibold transition-colors disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}
