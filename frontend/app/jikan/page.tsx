"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Search, ExternalLink, Zap } from "lucide-react";

const POPULAR = [
  { id: 5114,  title: "Fullmetal Alchemist: Brotherhood" },
  { id: 21,    title: "One Piece" },
  { id: 20,    title: "Naruto" },
  { id: 1735,  title: "Naruto: Shippuden" },
  { id: 11061, title: "Hunter x Hunter (2011)" },
  { id: 16498, title: "Shingeki no Kyojin" },
  { id: 38000, title: "Demon Slayer" },
  { id: 1,     title: "Cowboy Bebop" },
];

export default function JikanLookupPage() {
  const router = useRouter();
  const [input, setInput] = useState("");

  const go = (id: string | number) => {
    const parsed = Number(id);
    if (!parsed || parsed < 1) return;
    router.push(`/jikan/${parsed}`);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 py-10">
      {/* Başlık */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-[#6C5CE7]">
          <Zap className="w-5 h-5" />
          <span className="text-xs font-semibold tracking-widest uppercase">Jikan API v4</span>
        </div>
        <h1 className="font-heading text-3xl font-bold text-fg">
          Anime Bölüm Arama
        </h1>
        <p className="text-muted text-sm">
          MyAnimeList ID'si ile herhangi bir animenin tüm bölümlerini
          pagination dahil çek.
        </p>
      </div>

      {/* Arama kutusu */}
      <div className="bg-midnight border border-border rounded-2xl p-5 space-y-3">
        <label className="text-xs font-semibold text-muted uppercase tracking-wider">
          MAL Anime ID
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            min={1}
            placeholder="örn: 5114"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && go(input)}
            className="flex-1 bg-obsidian border border-border rounded-xl px-4 py-2.5 text-fg text-sm placeholder-dim focus:outline-none focus:border-[#6C5CE7] transition-colors"
          />
          <button
            onClick={() => go(input)}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#6C5CE7] hover:bg-[#5A4BD1] text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Search className="w-4 h-4" />
            Ara
          </button>
        </div>
        <p className="text-xs text-dim">
          MAL ID'yi{" "}
          <a
            href="https://myanimelist.net"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#6C5CE7] hover:underline inline-flex items-center gap-0.5"
          >
            myanimelist.net <ExternalLink className="w-2.5 h-2.5" />
          </a>
          {" "}adres çubuğundan bulabilirsin.
        </p>
      </div>

      {/* Hızlı seçimler */}
      <div className="space-y-3">
        <p className="text-xs font-semibold text-muted uppercase tracking-wider">
          Popüler Animeler
        </p>
        <div className="grid grid-cols-2 gap-2">
          {POPULAR.map((a) => (
            <button
              key={a.id}
              onClick={() => go(a.id)}
              className="flex items-center justify-between gap-2 bg-midnight border border-border hover:border-[#6C5CE7] rounded-xl px-3 py-2.5 text-left transition-colors group"
            >
              <span className="text-sm text-fg truncate group-hover:text-[#6C5CE7] transition-colors">
                {a.title}
              </span>
              <span className="text-xs text-dim shrink-0">#{a.id}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
