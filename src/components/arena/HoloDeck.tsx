import type { CSSProperties } from "react";
import bannerArt from "@/assets/bakura-vs-yugi.png.asset.json";
import { cardImageSmallUrl } from "@/data/catalog";

const HOLO_CARDS = [46986414, 89631139, 74677422, 10000000, 10000020, 10000010, 48179391, 83764718];

/** Rotating 3D hologram where cards rise and descend through a light column. */
export function HoloDeck() {
  return (
    <section className="holo-banner" aria-label="Holograma da Central do Duelista">
      <img src={bannerArt.url} alt="" className="holo-banner-art" />
      <div className="holo-banner-shade" />
      <div className="holo-stage" aria-hidden="true">
        <div className="holo-beam" />
        <div className="holo-ring holo-ring-a" />
        <div className="holo-ring holo-ring-b" />
        <div className="holo-carousel">
          {HOLO_CARDS.map((id, i) => (
            <div key={id} className="holo-slot" style={{ "--i": i, "--n": HOLO_CARDS.length } as CSSProperties}>
              <img src={cardImageSmallUrl(id)} alt="" className="holo-card" style={{ animationDelay: `${-i * 0.9}s` }} />
            </div>
          ))}
        </div>
        <div className="holo-base" />
      </div>
    </section>
  );
}
