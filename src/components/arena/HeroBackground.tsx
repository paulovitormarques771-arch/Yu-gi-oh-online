import { useEffect, useState } from "react";
import { motion, type MotionValue } from "framer-motion";
import bg from "@/assets/landing-bg.jpg.asset.json";

type Spark = { l: number; t: number; s: number; d: number; delay: number; c: string };

/** Cinematic landing background: slow zoom image, energy pulses, embers, sparkles and fog. */
export function HeroBackground({ y }: { y: MotionValue<number> }) {
  const [embers, setEmbers] = useState<Spark[]>([]);
  const [sparkles, setSparkles] = useState<Spark[]>([]);
  useEffect(() => {
    const colors = ["bg-gold", "bg-primary", "bg-magic", "bg-destructive"];
    setEmbers(Array.from({ length: 45 }, () => ({
      l: Math.random() * 100, t: 0, s: 2 + Math.random() * 4, d: 6 + Math.random() * 10,
      delay: Math.random() * -16, c: colors[Math.floor(Math.random() * colors.length)]!,
    })));
    setSparkles(Array.from({ length: 24 }, () => ({
      l: Math.random() * 100, t: Math.random() * 90, s: 2 + Math.random() * 3, d: 2 + Math.random() * 3,
      delay: Math.random() * 4, c: "bg-foreground",
    })));
  }, []);

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
      <motion.div style={{ y }} className="absolute inset-[-6%]">
        <div className="hero-zoom h-full w-full bg-cover bg-center" style={{ backgroundImage: `url(${bg.url})` }} />
      </motion.div>

      {/* Energy pulses at the clash point and on each side */}
      <div className="hero-pulse absolute left-1/2 top-[58%] h-[40vmin] w-[40vmin] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold/40 blur-3xl" />
      <div className="hero-pulse absolute left-[15%] top-[30%] h-[35vmin] w-[35vmin] rounded-full bg-destructive/25 blur-3xl" style={{ animationDelay: "-1.5s" }} />
      <div className="hero-pulse absolute right-[10%] top-[25%] h-[40vmin] w-[40vmin] rounded-full bg-primary/25 blur-3xl" style={{ animationDelay: "-0.7s" }} />
      <div className="hero-flash absolute inset-0 bg-primary/10" />

      {/* Fog layers */}
      <div className="hero-fog absolute -left-1/4 bottom-0 h-1/3 w-[150%] bg-gradient-to-t from-foreground/15 to-transparent blur-2xl" />
      <div className="hero-fog-rev absolute -left-1/4 bottom-[10%] h-1/4 w-[150%] bg-gradient-to-t from-magic/15 to-transparent blur-2xl" />

      {embers.map((p, i) => (
        <span key={`e${i}`} className={`absolute bottom-0 rounded-full ${p.c} blur-[1px]`}
          style={{ left: `${p.l}%`, width: p.s, height: p.s, animation: `float-up ${p.d}s linear ${p.delay}s infinite` }} />
      ))}
      {sparkles.map((p, i) => (
        <span key={`s${i}`} className="hero-twinkle absolute rounded-full bg-foreground"
          style={{ left: `${p.l}%`, top: `${p.t}%`, width: p.s, height: p.s, animationDuration: `${p.d}s`, animationDelay: `${p.delay}s` }} />
      ))}

      {/* Readability vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,var(--background)_95%)]" />
      <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background" />
    </div>
  );
}
