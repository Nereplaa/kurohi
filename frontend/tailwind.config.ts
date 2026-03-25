import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Base colors (dark theme)
        "anime-bg-primary": "#0B0D17",
        "anime-bg-secondary": "#111425",
        "anime-bg-tertiary": "#1A1D2E",
        "anime-bg-surface": "#212438",
        // Accent colors
        "anime-accent": "#6C5CE7",
        "anime-accent-hover": "#7E70F0",
        "anime-cyan": "#00D2FF",
        "anime-pink": "#FD79A8",
        "anime-gold": "#FDCB6E",
        // Text
        "anime-text": "#EAEAEF",
        "anime-text-secondary": "#A0A3B1",
        "anime-text-tertiary": "#6B6E7D",
        // Semantic
        "anime-success": "#00B894",
        "anime-warning": "#FDCB6E",
        "anime-error": "#FF6B6B",
        "anime-info": "#74B9FF",
        // Border
        "anime-border": "#2A2D3E",
        "anime-border-focus": "#6C5CE7",
        // Legacy compat (used across existing pages)
        crimson: "#E63946",
        violet: "#6C5CE7",
        cyan: "#00D2FF",
        abyss: "#0B0D17",
        midnight: "#111425",
        slate: "#1A1D2E",
        obsidian: "#212438",
        border: "#2A2D3E",
      },
      fontFamily: {
        heading: ["Inter", "Noto Sans", "sans-serif"],
        body: ["Inter", "Noto Sans", "sans-serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        sm: "0 1px 3px rgba(0,0,0,0.4)",
        md: "0 4px 12px rgba(0,0,0,0.5)",
        lg: "0 8px 24px rgba(0,0,0,0.6)",
        glow: "0 0 20px rgba(108,92,231,0.3)",
      },
    },
  },
  plugins: [],
};

export default config;
