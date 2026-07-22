"use client";

import { createTheme } from "@mui/material/styles";

/**
 * MUI themed to TraderCat's brand — not a generic Material admin panel. Keeps
 * the editorial serif headings, the P&L green/red, the ink/surface neutrals and
 * the soft card treatment we already use, so MUI components feel native here.
 */

const INK = "#14181f";
const INK_SOFT = "#59616e";
const LINE = "#e7eaf0";
const BG = "#f6f7f9";
const SURFACE = "#ffffff";
const POS = "#17915f";
const NEG = "#bd4640";
const AMBER = "#c68a1d";
const INFO = "#3a5a9c";

const SANS =
  "var(--font-sans), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";
const SERIF = "var(--font-display), Georgia, 'Times New Roman', serif";

const CARD_SHADOW =
  "0 1px 1px rgba(18,22,28,0.03), 0 2px 4px rgba(18,22,28,0.03), 0 8px 24px rgba(18,22,28,0.04)";

export const theme = createTheme({
  // Align with Tailwind's breakpoints so the MUI shell and the Tailwind pages
  // agree on when to go "desktop" (lg = 1024).
  breakpoints: { values: { xs: 0, sm: 640, md: 768, lg: 1024, xl: 1280 } },
  palette: {
    mode: "light",
    primary: { main: INK, contrastText: "#ffffff" },
    secondary: { main: INFO },
    success: { main: POS, contrastText: "#ffffff" },
    error: { main: NEG, contrastText: "#ffffff" },
    warning: { main: AMBER },
    info: { main: INFO },
    background: { default: BG, paper: SURFACE },
    text: { primary: INK, secondary: INK_SOFT },
    divider: LINE,
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: SANS,
    h1: { fontFamily: SERIF, fontWeight: 600, letterSpacing: "-0.02em" },
    h2: { fontFamily: SERIF, fontWeight: 600, letterSpacing: "-0.015em" },
    h3: { fontFamily: SERIF, fontWeight: 600, letterSpacing: "-0.01em" },
    h4: { fontFamily: SERIF, fontWeight: 600, letterSpacing: "-0.01em" },
    h5: { fontFamily: SERIF, fontWeight: 600 },
    h6: { fontWeight: 700 },
    button: { textTransform: "none", fontWeight: 600 },
    subtitle2: { fontWeight: 600 },
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiCard: {
      defaultProps: { elevation: 0 },
      styleOverrides: {
        root: {
          border: `1px solid ${LINE}`,
          borderRadius: 16,
          boxShadow: CARD_SHADOW,
        },
      },
    },
    MuiCardContent: {
      styleOverrides: { root: { "&:last-child": { paddingBottom: 16 } } },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 999, paddingInline: 18 } },
    },
    MuiAppBar: {
      defaultProps: { elevation: 0, color: "inherit" },
      styleOverrides: {
        root: {
          backgroundColor: SURFACE,
          color: INK,
          borderBottom: `1px solid ${LINE}`,
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: SURFACE, borderColor: LINE },
      },
    },
    MuiListItemButton: {
      styleOverrides: {
        root: {
          borderRadius: 10,
          "&.Mui-selected": {
            backgroundColor: INK,
            color: "#ffffff",
            "&:hover": { backgroundColor: INK },
            "& .MuiListItemIcon-root": { color: "#ffffff" },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, borderRadius: 8 } },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { backgroundColor: INK, fontSize: 12, borderRadius: 8 },
      },
    },
  },
});
