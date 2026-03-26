"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, LogOut, User, Shield, Film, Heart, Crown, Languages, Sun, Moon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuthStore, useIsAdmin } from "@/store/auth";
import { useLanguageStore } from "@/store/language";
import { useThemeStore } from "@/store/theme";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  const { user, logout } = useAuthStore();
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const { locale, setLocale } = useLanguageStore();
  const { theme, toggle: toggleTheme } = useThemeStore();
  const t = useTranslations("nav");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) {
      router.push(`/?search=${encodeURIComponent(search.trim())}`);
    }
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const toggleLocale = () => setLocale(locale === "tr" ? "en" : "tr");

  return (
    <header className="sticky top-0 z-50 bg-slate/90 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-4 shrink-0">
          <Film className="w-6 h-6 text-crimson" />
          <span className="font-heading font-bold text-xl text-fg tracking-wider">KUROHI</span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dim" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search")}
              className="w-full bg-obsidian border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-fg placeholder-dim focus:outline-none focus:border-crimson transition-colors"
            />
          </div>
        </form>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          <Link href="/" className="px-3 py-1.5 text-sm text-muted hover:text-fg transition-colors rounded">
            {t("discover")}
          </Link>
          {user && (
            <>
              <Link href="/favorites" className="px-3 py-1.5 text-sm text-muted hover:text-fg transition-colors rounded flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> {t("favorites")}
              </Link>
              <Link href="/subscription" className="px-3 py-1.5 text-sm text-muted hover:text-fg transition-colors rounded flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> {t("subscription")}
              </Link>
              <Link href="/profile" className="px-3 py-1.5 text-sm text-muted hover:text-fg transition-colors rounded">
                {t("profile")}
              </Link>
            </>
          )}
          {isAdmin && (
            <Link href="/admin" className="px-3 py-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors rounded flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> {t("admin")}
            </Link>
          )}
        </nav>

        {/* Auth + Language toggle */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg border border-border text-muted hover:text-fg hover:border-crimson/50 transition-colors"
            title={theme === "dark" ? "Açık tema" : "Koyu tema"}
          >
            {theme === "dark"
              ? <Sun className="w-4 h-4" />
              : <Moon className="w-4 h-4" />
            }
          </button>

          {/* Language toggle */}
          <button
            onClick={toggleLocale}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-border text-xs font-semibold text-muted hover:text-fg hover:border-crimson/50 transition-colors"
            title={locale === "tr" ? "Switch to English" : "Türkçeye geç"}
          >
            <Languages className="w-3.5 h-3.5" />
            {locale === "tr" ? "EN" : "TR"}
          </button>

          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 text-sm text-muted hover:text-fg transition-colors">
                <div className="w-8 h-8 rounded-full bg-violet flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:block">{user.name}</span>
              </Link>
              <button onClick={handleLogout} className="p-2 text-dim hover:text-crimson transition-colors" title={t("logout")}>
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">{t("login")}</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">{t("register")}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
