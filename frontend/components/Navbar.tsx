"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Search, LogOut, User, Shield, Film, Heart, Crown } from "lucide-react";
import { useAuthStore, useIsAdmin } from "@/store/auth";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  const { user, logout } = useAuthStore();
  const isAdmin = useIsAdmin();
  const router = useRouter();
  const [search, setSearch] = useState("");

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

  return (
    <header className="sticky top-0 z-50 bg-slate/90 backdrop-blur border-b border-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 mr-4 shrink-0">
          <Film className="w-6 h-6 text-crimson" />
          <span className="font-heading font-bold text-xl text-[#F0F0F5] tracking-wider">KUROHI</span>
        </Link>

        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4A4A6A]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Anime ara..."
              className="w-full bg-obsidian border border-border rounded-lg pl-9 pr-4 py-2 text-sm text-[#F0F0F5] placeholder-[#4A4A6A] focus:outline-none focus:border-crimson transition-colors"
            />
          </div>
        </form>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1 ml-2">
          <Link href="/" className="px-3 py-1.5 text-sm text-[#8A8AA8] hover:text-[#F0F0F5] transition-colors rounded">
            Keşfet
          </Link>
          {user && (
            <>
              <Link href="/favorites" className="px-3 py-1.5 text-sm text-[#8A8AA8] hover:text-[#F0F0F5] transition-colors rounded flex items-center gap-1">
                <Heart className="w-3.5 h-3.5" /> Favoriler
              </Link>
              <Link href="/subscription" className="px-3 py-1.5 text-sm text-[#8A8AA8] hover:text-[#F0F0F5] transition-colors rounded flex items-center gap-1">
                <Crown className="w-3.5 h-3.5" /> Abonelik
              </Link>
              <Link href="/profile" className="px-3 py-1.5 text-sm text-[#8A8AA8] hover:text-[#F0F0F5] transition-colors rounded">
                Profilim
              </Link>
            </>
          )}
          {isAdmin && (
            <Link href="/admin" className="px-3 py-1.5 text-sm text-amber-400 hover:text-amber-300 transition-colors rounded flex items-center gap-1">
              <Shield className="w-3.5 h-3.5" /> Admin
            </Link>
          )}
        </nav>

        {/* Auth */}
        <div className="ml-auto flex items-center gap-2 shrink-0">
          {user ? (
            <>
              <Link href="/profile" className="flex items-center gap-2 text-sm text-[#8A8AA8] hover:text-[#F0F0F5] transition-colors">
                <div className="w-8 h-8 rounded-full bg-violet flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
                <span className="hidden sm:block">{user.name}</span>
              </Link>
              <button onClick={handleLogout} className="p-2 text-[#4A4A6A] hover:text-crimson transition-colors" title="Çıkış Yap">
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">Giris Yap</Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Kayit Ol</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
