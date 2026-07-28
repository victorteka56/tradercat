import type { Config } from "tailwindcss";

/**
 * Themeable colour token that still honours Tailwind's `/opacity` modifier.
 *
 * A bare `var(--pos)` cannot: Tailwind compiles `bg-pos/10` to
 * `rgb(var(--pos) / 0.1)`, and since the variable holds a hex rather than
 * channels, that declaration is invalid and the browser drops it — the element
 * renders fully transparent, silently. `color-mix` composes the alpha instead,
 * and with no modifier `<alpha-value>` resolves to 1, leaving the colour exact.
 */
const token = (name: string) =>
  `color-mix(in srgb, var(${name}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: token("--bg"),
        surface: token("--surface"),
        "surface-2": token("--surface-2"),
        ink: token("--ink"),
        "ink-soft": token("--ink-soft"),
        "ink-faint": token("--ink-faint"),
        line: token("--line"),
        info: token("--info"),
        pos: token("--pos"),
        neg: token("--neg"),
        amber: token("--amber"),
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
        display: ["var(--font-display)", "Georgia", "Cambria", "Times New Roman", "serif"],
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
