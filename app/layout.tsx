import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TraderCat — Trading Journal",
  description:
    "Mobile-first trading journal + AI trade review. See what you traded, understand why it worked, and know what to review next.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f6f7f9",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-bg font-sans">{children}</body>
    </html>
  );
}
