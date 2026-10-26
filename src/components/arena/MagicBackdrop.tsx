import { useEffect, useState } from "react";

/** Floating particles + rotating rune circles. Particles are generated after mount to avoid hydration mismatch. */
export function MagicBackdrop() {
  const [parts, setParts] = useState<{ l: number; d: number; s: number; delay: number; hue: string }[]>([]);
  useEffect(() => {
    setParts(
      Array.from({ length: 40 }, () => ({
        l: Math.random() * 100,
        d: 8 + Math.random() * 12,
        s: 2 + Math.random() * 4,
        delay: Math.random() * -20,
        hue: Math.random() > 0.5 ? "bg-primary" : Math.random() > 0.5 ? "bg-magic" : "bg-gold",
      })),
    );
  }, []);
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute left-1/2 top-1/2 h-[900px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/10 animate-rune">
        <div className="absolute inset-12 rounded-full border border-dashed border-magic/20" />
        <div className="absolute inset-32 rounded-full border border-gold/10 animate-rune-reverse" />
      </div>
      {parts.map((p, i) => (
        <span
          key={i}
          className={`absolute bottom-0 rounded-full ${p.hue} opacity-70 blur-[1px]`}
          style={{ left: `${p.l}%`, width: p.s, height: p.s, animation: `float-up ${p.d}s linear ${p.delay}s infinite` }}
        />
      ))}
    </div>
  );
}
