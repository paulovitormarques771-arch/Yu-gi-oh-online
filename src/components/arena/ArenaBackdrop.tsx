import { useEffect, useState } from "react";
import bg from "@/assets/arena-bg.jpg.asset.json";

type P = { l: number; s: number; d: number; delay: number; c: string };

/** Duel arena background: base image with neon light sweeps, energy particles and atmosphere. */
export function ArenaBackdrop() {
  const [parts, setParts] = useState<P[]>([]);
  useEffect(() => {
    const c = ["bg-primary", "bg-magic", "bg-gold"];
    setParts(Array.from({ length: 50 }, () => ({
      l: Math.random() * 100, s: 2 + Math.random() * 4, d: 7 + Math.random() * 10,
      delay: Math.random() * -17, c: c[Math.floor(Math.random() * 3)]!,
    })));
  }, []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="hero-zoom absolute inset-[-4%] bg-cover bg-center opacity-60 blur-[3px]" style={{ backgroundImage: `url(${bg.url})` }} />
      <div className="absolute inset-0 bg-background/55" />
      <div className="arena-sweep absolute -left-1/2 top-0 h-full w-1/2 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      <div className="arena-sweep absolute -left-1/2 top-0 h-full w-1/3 bg-gradient-to-r from-transparent via-magic/20 to-transparent" style={{ animationDelay: "-4s", animationDuration: "11s" }} />
      <div className="hero-pulse absolute -left-[10%] top-[10%] h-[50vmin] w-[50vmin] rounded-full bg-magic/30 blur-3xl" />
      <div className="hero-pulse absolute -right-[10%] top-[5%] h-[50vmin] w-[50vmin] rounded-full bg-primary/30 blur-3xl" style={{ animationDelay: "-2s" }} />
      <div className="hero-pulse absolute left-1/2 top-1/2 h-[30vmin] w-[60vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/20 blur-3xl" style={{ animationDelay: "-1s" }} />
      <div className="hero-fog absolute -left-1/4 bottom-0 h-1/3 w-[150%] bg-gradient-to-t from-primary/15 to-transparent blur-2xl" />
      {parts.map((p, i) => (
        <span key={i} className={`absolute bottom-0 rounded-full ${p.c} blur-[1px]`}
          style={{ left: `${p.l}%`, width: p.s, height: p.s, animation: `float-up ${p.d}s linear ${p.delay}s infinite` }} />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,var(--background)_100%)]" />
    </div>
  );
}
