"use client";
import { useEffect } from "react";
import { useThemeStore } from "@/store/theme";

// Renders nothing — just syncs theme store → <html data-theme="...">
export function ThemeProvider() {
  const { theme } = useThemeStore();

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return null;
}
