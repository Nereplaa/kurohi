import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Theme-aware backgrounds (CSS variable backed) ──────────────
        abyss:    "var(--color-abyss)",
        midnight: "var(--color-midnight)",
        slate:    "var(--color-slate)",
        obsidian: "var(--color-obsidian)",
        border:   "var(--color-border)",
        crimson:  "var(--color-crimson)",
        violet:   "var(--color-violet)",

        // Anime-prefixed bg aliases (used in AnimeCard etc.)
        "anime-bg-primary":   "var(--color-anime-bg-primary)",
        "anime-bg-secondary": "var(--color-anime-bg-secondary)",
        "anime-bg-tertiary":  "var(--color-anime-bg-tertiary)",
        "anime-bg-surface":   "var(--color-anime-bg-surface)",

        // ── Theme-aware text colors ────────────────────────────────────
        // Use these instead of raw `text-[#hex]` so light mode works
        fg:     "var(--color-fg)",       // replaces #F0F0F5 / #0A0A14
        muted:  "var(--color-muted)",    // replaces #8A8AA8 / #5A5A7A
        dim:    "var(--color-dim)",      // replaces #4A4A6A / #8A8AAA
        dimmer: "var(--color-dimmer)",   // replaces #2A2A42 / #C0C0D8

        // ── Static accent colors (unchanged between themes) ────────────
        "anime-accent":       "#6C5CE7",
        "anime-accent-hover": "#7E70F0",
        "anime-cyan":         "#00D2FF",
        "anime-pink":         "#FD79A8",
        "anime-gold":         "#FDCB6E",
        cyan:                 "#00D2FF",

        // ── Static text (legacy, prefer fg/muted/dim above) ───────────
        "anime-text":           "#EAEAEF",
        "anime-text-secondary": "#A0A3B1",
        "anime-text-tertiary":  "#6B6E7D",

        // ── Semantic ──────────────────────────────────────────────────
        "anime-success": "#00B894",
        "anime-warning": "#FDCB6E",
        "anime-error":   "#FF6B6B",
        "anime-info":    "#74B9FF",
        "anime-border":  "var(--color-border)",
        "anime-border-focus": "#6C5CE7",
      },
      fontFamily: {
        heading: ["Inter", "Noto Sans", "sans-serif"],
        body:    ["Inter", "Noto Sans", "sans-serif"],
        mono:    ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        sm:   "0 1px 3px rgba(0,0,0,0.4)",
        md:   "0 4px 12px rgba(0,0,0,0.5)",
        lg:   "0 8px 24px rgba(0,0,0,0.6)",
        glow: "0 0 20px rgba(108,92,231,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
