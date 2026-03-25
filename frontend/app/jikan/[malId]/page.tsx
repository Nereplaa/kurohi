"use client";

import { use } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { JikanEpisodeList } from "@/components/JikanEpisodeList";

export default function JikanAnimePage({
  params,
}: {
  params: Promise<{ malId: string }>;
}) {
  const { malId } = use(params);
  const id = Number(malId);

  if (!id || id < 1) {
    return (
      <div className="text-center py-20 text-[#8A8AA8]">
        Geçersiz MAL ID.{" "}
        <Link href="/jikan" className="text-[#6C5CE7] hover:underline">
          Geri dön
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link
        href="/jikan"
        className="flex items-center gap-2 text-sm text-[#8A8AA8] hover:text-[#F0F0F5] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Anime Ara
      </Link>

      <JikanEpisodeList malId={id} />
    </div>
  );
}
