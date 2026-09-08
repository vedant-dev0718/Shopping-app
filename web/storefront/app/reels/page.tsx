"use client";

import { useEffect, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ReelsSpotlight } from "@/components/ReelsSpotlight";
import { getReels } from "@/lib/api/reels";
import type { Reel } from "@/lib/api/discovery";

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[] | null>(null);

  useEffect(() => {
    getReels().then(setReels).catch(() => setReels([]));
  }, []);

  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-cream)]">
      <SiteHeader />
      <main className="flex-1">
        {reels === null ? (
          <p className="py-24 text-center text-[var(--color-ink)]/50">Loading reels…</p>
        ) : reels.length === 0 ? (
          <p className="py-24 text-center text-[var(--color-ink)]/50">No reels yet.</p>
        ) : (
          <ReelsSpotlight reels={reels} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
