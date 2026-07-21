import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        "surface-2": "var(--surface-2)",
        ink: "var(--ink)",
        "ink-soft": "var(--ink-soft)",
        "ink-faint": "var(--ink-faint)",
        line: "var(--line)",
        info: "var(--info)",
        pos: "var(--pos)",
        neg: "var(--neg)",
        amber: "var(--amber)",
      },
      borderRadius: {
        card: "16px",
      },
      fontFamily: {
        sans: [
          "var(--font-sans)",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "Roboto",
          "Helvetica Neue",
          "Arial",
          "sans-serif",
        ],
      },
      boxShadow: {
        card: "0 1px 1px rgba(18,22,28,0.03), 0 2px 4px rgba(18,22,28,0.03), 0 8px 24px rgba(18,22,28,0.04)",
        "card-hover": "0 1px 1px rgba(18,22,28,0.04), 0 4px 10px rgba(18,22,28,0.06), 0 16px 40px rgba(18,22,28,0.07)",
      },
    },
  },
  plugins: [],
};

export default config;
