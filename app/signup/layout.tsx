import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Get started",
  description:
    "Create your TraderCat account — import your trades and get a journal that rebuilds, charts and reviews every one.",
  alternates: { canonical: "/signup" },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
