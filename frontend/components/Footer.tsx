import Link from "next/link";
import { Film } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border mt-16">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
          {/* Brand */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2">
              <Film className="w-5 h-5 text-crimson" />
              <span className="font-heading font-bold text-lg text-fg tracking-wider">KUROHI</span>
            </Link>
            <p className="text-dim text-sm">Anime kesfet, izle ve takip et.</p>
          </div>

          {/* Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">Platform</h4>
            <nav className="flex flex-col gap-1.5">
              <Link href="/" className="text-sm text-dim hover:text-fg transition-colors">Anime Kesfet</Link>
              <Link href="/favorites" className="text-sm text-dim hover:text-fg transition-colors">Favoriler</Link>
              <Link href="/subscription" className="text-sm text-dim hover:text-fg transition-colors">Abonelik</Link>
            </nav>
          </div>

          {/* Account */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted uppercase tracking-wider">Hesap</h4>
            <nav className="flex flex-col gap-1.5">
              <Link href="/login" className="text-sm text-dim hover:text-fg transition-colors">Giris Yap</Link>
              <Link href="/register" className="text-sm text-dim hover:text-fg transition-colors">Kayit Ol</Link>
              <Link href="/profile" className="text-sm text-dim hover:text-fg transition-colors">Profil</Link>
            </nav>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 text-center">
          <p className="text-xs text-dim">KUROHI Anime Izleme Platformu</p>
        </div>
      </div>
    </footer>
  );
}
