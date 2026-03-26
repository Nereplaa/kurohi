import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Locale = "tr" | "en";

interface LanguageStore {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

export const useLanguageStore = create<LanguageStore>()(
  persist(
    (set) => ({
      locale: "tr",
      setLocale: (locale) => set({ locale }),
    }),
    { name: "kurohi-locale" }
  )
);
