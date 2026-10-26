import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Swords } from "lucide-react";

export function SiteNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-black tracking-widest">
          <Swords className="h-5 w-5 text-gold" /> <span className="text-gold">DUEL</span><span className="text-energy">ARENA</span>
        </Link>
        <div className="flex items-center gap-5 text-sm font-semibold uppercase tracking-wider">
          <Link to="/" activeOptions={{ exact: true }} className="text-muted-foreground hover:text-foreground [&.active]:text-primary">Início</Link>
          <Link to="/jogar" className="text-muted-foreground hover:text-foreground [&.active]:text-primary">Jogar</Link>
          <Link to="/duelo/$roomId" params={{ roomId: "treino" }} className="text-muted-foreground hover:text-foreground [&.active]:text-primary">Arena</Link>
        </div>
      </nav>
    </header>
  );
}

export function DuelButton({ children }: { children: ReactNode }) {
  return (
    <Link
      to="/jogar"
      className="group relative inline-flex items-center gap-3 rounded-md bg-gold-gradient px-10 py-4 font-display text-xl font-black tracking-widest text-gold-foreground glow-gold transition-transform hover:scale-105"
    >
      <Swords className="h-6 w-6 transition-transform group-hover:rotate-12" />
      {children}
    </Link>
  );
}
