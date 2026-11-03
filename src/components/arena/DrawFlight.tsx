import { useEffect, useRef } from "react";
import { CardBack } from "@/components/arena/ArenaCard";
import type { DrawEvent } from "@/lib/spell-cinematics";

/** Follow the actual projected deck and hand positions, not fixed viewport offsets. */
export function DrawFlight({ event, viewer }: { event: DrawEvent; viewer: 0 | 1 }) {
  const refs = useRef(new Map<number, HTMLDivElement>());
  const own = event.owner === viewer;
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const deck = document.querySelector(own ? '[data-deck-side="own"]' : '[data-deck-side="enemy"]')?.getBoundingClientRect();
    const hand = document.querySelector(own ? ".arena-hand" : ".arena-opponent-hand")?.getBoundingClientRect();
    if (!deck || !hand) return;
    const animations = [...refs.current.entries()].map(([i, element]) => {
      const x = deck.left + deck.width / 2 - 36, y = deck.top + deck.height / 2 - 52;
      const endX = hand.left + hand.width / 2 - 36 + i * 14, endY = hand.top + hand.height / 2 - 52;
      return element.animate([
        { transform: `translate(${x}px, ${y}px) rotateY(180deg) scale(.7)`, opacity: 0 },
        { transform: `translate(${x}px, ${y - 80}px) rotateY(130deg) scale(1)`, opacity: 1, offset: .25 },
        { transform: `translate(${(x + endX) / 2}px, ${Math.min(y, endY) - 110}px) rotateY(${own ? 50 : 180}deg) scale(1.15)`, opacity: 1, offset: .55 },
        { transform: `translate(${endX}px, ${endY}px) rotateY(${own ? 0 : 180}deg) scale(.95)`, opacity: 1, offset: .9 },
        { transform: `translate(${endX}px, ${endY}px) rotateY(${own ? 0 : 180}deg) scale(.95)`, opacity: 0 },
      ], { duration: 1350, delay: i * 180, easing: "ease-in-out", fill: "both" });
    });
    return () => animations.forEach((a) => a.cancel());
  }, [event.id, own]);
  return <div className="arena-draw-flight" aria-hidden="true">{event.cards.map((card, i) => <div key={i} className="arena-flight-card" ref={(el) => { if (el) refs.current.set(i, el); else refs.current.delete(i); }}><div className="arena-flight-front">{own && card.imageUrl ? <img src={card.imageUrl} alt="" /> : <CardBack />}</div><div className="arena-flight-back"><CardBack /></div></div>)}</div>;
}