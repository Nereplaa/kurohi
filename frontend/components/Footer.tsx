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
              <span className="font-heading font-bold text-lg text-[#F0F0F5] tracking-wider">KUROHI</span>
            </Link>
            <p className="text-[#4A4A6A] text-sm">Anime kesfet, izle ve takip et.</p>
          </div>

          {/* Links */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[#8A8AA8] uppercase tracking-wider">Platform</h4>
            <nav className="flex flex-col gap-1.5">
              <Link href="/" className="text-sm text-[#4A4A6A] hover:text-[#F0F0F5] transition-colors">Anime Kesfet</Link>
              <Link href="/favorites" className="text-sm text-[#4A4A6A] hover:text-[#F0F0F5] transition-colors">Favoriler</Link>
              <Link href="/subscription" className="text-sm text-[#4A4A6A] hover:text-[#F0F0F5] transition-colors">Abonelik</Link>
            </nav>
          </div>

          {/* Account */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-[#8A8AA8] uppercase tracking-wider">Hesap</h4>
            <nav className="flex flex-col gap-1.5">
              <Link href="/login" className="text-sm text-[#4A4A6A] hover:text-[#F0F0F5] transition-colors">Giris Yap</Link>
              <Link href="/register" className="text-sm text-[#4A4A6A] hover:text-[#F0F0F5] transition-colors">Kayit Ol</Link>
              <Link href="/profile" className="text-sm text-[#4A4A6A] hover:text-[#F0F0F5] transition-colors">Profil</Link>
            </nav>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-6 text-center">
          <p className="text-xs text-[#4A4A6A]">KUROHI Anime Izleme Platformu</p>
        </div>
      </div>
    </footer>
  );
}
