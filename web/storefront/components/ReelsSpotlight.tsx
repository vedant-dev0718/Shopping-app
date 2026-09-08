"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import type { Reel } from "@/lib/api/discovery";

function ReelVideo({ reel, playing }: { reel: Reel; playing: boolean }) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !playing || !reel.videoUrl) return;

    let hlsInstance: import("hls.js").default | null = null;
    let cancelled = false;

    async function attach() {
      if (video!.canPlayType("application/vnd.apple.mpegurl")) {
        video!.src = reel.videoUrl;
      } else {
        const { default: Hls } = await import("hls.js");
        if (cancelled) return;
        if (Hls.isSupported()) {
          hlsInstance = new Hls();
          hlsInstance.loadSource(reel.videoUrl);
          hlsInstance.attachMedia(video!);
        }
      }
      video!.play().catch(() => {});
    }

    attach();

    return () => {
      cancelled = true;
      hlsInstance?.destroy();
    };
  }, [playing, reel.videoUrl]);

  if (!playing) {
    return (
      <Image
        src={reel.thumbnailUrl}
        alt={reel.caption || "Reel"}
        fill
        sizes="(max-width: 1024px) 100vw, 420px"
        className="object-cover"
      />
    );
  }

  return (
    <video
      ref={videoRef}
      className="h-full w-full object-cover"
      muted
      loop
      playsInline
      poster={reel.thumbnailUrl}
    />
  );
}

export function ReelsSpotlight({ reels }: { reels: Reel[] }) {
  const playable = useMemo(() => reels.filter((reel) => reel.thumbnailUrl), [reels]);
  const [activeId, setActiveId] = useState(playable[0]?._id);
  const [isPlaying, setIsPlaying] = useState(false);

  const active = playable.find((reel) => reel._id === activeId) ?? playable[0];

  if (!active) return null;

  return (
    <section className="bg-[var(--color-charcoal)] py-16 text-[var(--color-cream)]">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 text-center">
          <span className="text-xs uppercase tracking-[0.3em] text-[var(--color-copper-bright)]">Reels to Real Life</span>
          <h2 className="mt-2 font-display text-3xl">Shop Every Look, Straight From the Reel</h2>
        </div>

        <div className="grid gap-8 lg:grid-cols-[420px_1fr]">
          <div className="relative mx-auto aspect-9/16 w-full max-w-[420px] overflow-hidden rounded-2xl border border-[var(--color-copper)]/25 bg-black">
            <ReelVideo reel={active} playing={isPlaying} />

            {!isPlaying && (
              <button
                type="button"
                onClick={() => setIsPlaying(true)}
                aria-label="Play reel"
                className="absolute inset-0 flex items-center justify-center bg-black/20 transition-colors hover:bg-black/30"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-copper-bright)]/90 text-2xl text-[var(--color-charcoal)]">
                  ▶
                </span>
              </button>
            )}

            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-4">
              <p className="line-clamp-2 text-sm">{active.caption}</p>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div>
              <h3 className="mb-4 text-xs uppercase tracking-[0.25em] text-[var(--color-silver)]">
                Tagged in this reel
              </h3>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                {active.taggedProductIds.map((product) => (
                  <Link
                    key={product._id}
                    href={`/products/${product._id}`}
                    className="group flex flex-col overflow-hidden rounded-lg border border-[var(--color-copper)]/20 bg-white/5"
                  >
                    <div className="relative aspect-square w-full bg-white/10">
                      {product.imageUrls[0] && (
                        <Image
                          src={product.imageUrls[0]}
                          alt={product.title}
                          fill
                          sizes="180px"
                          className="object-cover transition-transform group-hover:scale-105"
                        />
                      )}
                    </div>
                    <div className="p-3">
                      <p className="line-clamp-1 text-xs text-[var(--color-silver)]">{product.title}</p>
                      <p className="font-display text-sm text-[var(--color-copper-bright)]">
                        ₹{product.price.toLocaleString("en-IN")}
                      </p>
                    </div>
                  </Link>
                ))}
                {active.taggedProductIds.length === 0 && (
                  <p className="col-span-full text-sm text-[var(--color-silver)]/70">No products tagged in this reel yet.</p>
                )}
              </div>
            </div>

            <div className="copper-divider" />

            <div>
              <h3 className="mb-4 text-xs uppercase tracking-[0.25em] text-[var(--color-silver)]">More reels</h3>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-2">
                {playable.map((reel) => (
                  <button
                    key={reel._id}
                    type="button"
                    onClick={() => {
                      setActiveId(reel._id);
                      setIsPlaying(false);
                    }}
                    className={`relative h-28 w-20 flex-shrink-0 overflow-hidden rounded-lg border transition-colors ${
                      reel._id === active._id
                        ? "border-[var(--color-copper-bright)]"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <Image src={reel.thumbnailUrl} alt={reel.caption || "Reel"} fill sizes="80px" className="object-cover" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
