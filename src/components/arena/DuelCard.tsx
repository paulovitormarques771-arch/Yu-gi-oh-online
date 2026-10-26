import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { CardData } from "@/data/catalog";

const kindStyle: Record<CardData["kind"], string> = {
  monster: "from-gold/30 via-card to-card",
  spell: "from-primary/40 via-card to-card",
  trap: "from-magic/50 via-card to-card",
};

export function DuelCard({ card, className, interactive = true }: { card: CardData; className?: string; interactive?: boolean }) {
  const legendary = card.rarity === "lendaria";
  return (
    <motion.div
      whileHover={interactive ? { rotateY: 10, rotateX: -6, y: -10, scale: 1.04 } : undefined}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className={cn(
        "preserve-3d relative aspect-[59/86] w-44 rounded-lg border-2 p-2 shadow-2xl bg-gradient-to-b",
        kindStyle[card.kind],
        legendary ? "border-gold glow-gold" : "border-border",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="truncate font-display text-[11px] font-bold leading-tight">{card.name}</span>
        {card.attribute && <span className="shrink-0 rounded-full bg-background/70 px-1 text-[8px] text-muted-foreground">{card.attribute}</span>}
      </div>
      {card.level && <div className="mt-0.5 text-right text-[9px] tracking-widest text-gold">{"★".repeat(Math.min(card.level, 12))}</div>}
      <div className="mt-1 flex aspect-square items-center justify-center overflow-hidden rounded border border-border bg-background/60">
        {card.imageUrl ? (
          <img src={card.imageUrl} alt={card.name} className="h-full w-full object-cover" />
        ) : (
          <div className="relative flex h-full w-full items-center justify-center">
            <div className="absolute h-3/4 w-3/4 rounded-full border border-dashed border-primary/40 animate-rune" />
            <span className="px-2 text-center font-display text-[10px] text-muted-foreground">{card.name}<br /><span className="text-[8px] opacity-70">arte autorizada pendente</span></span>
          </div>
        )}
      </div>
      <p className="mt-1 line-clamp-3 text-[9px] leading-snug text-muted-foreground">{card.text}</p>
      {card.kind === "monster" ? (
        <div className="absolute bottom-1.5 right-2 text-[10px] font-bold">
          ATK/{card.atk ?? "?"} DEF/{card.def ?? "?"}
        </div>
      ) : (
        <div className="absolute bottom-1.5 right-2 text-[10px] font-bold uppercase text-primary">{card.kind === "spell" ? "Magia" : "Armadilha"}</div>
      )}
    </motion.div>
  );
}
