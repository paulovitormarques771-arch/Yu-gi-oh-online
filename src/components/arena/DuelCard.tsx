import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ATTRIBUTE_LABELS, type CardData } from "@/data/catalog";
import { rareCard } from "@/lib/duel-setup";

const kindStyle: Record<CardData["kind"], string> = {
  monster: "from-gold/30 via-card to-card",
  spell: "from-primary/40 via-card to-card",
  trap: "from-magic/50 via-card to-card",
};

export function DuelCard({ card, className, interactive = true }: { card: CardData; className?: string; interactive?: boolean }) {
  const legendary = card.rarity === "lendaria";
  return (
    <motion.div
      {...(interactive ? { whileHover: { rotateY: 10, rotateX: -6, y: -10, scale: 1.04 } } : {})}
      transition={{ type: "spring", stiffness: 220, damping: 18 }}
      className={cn(
        "preserve-3d relative aspect-[59/86] w-44 overflow-hidden rounded-lg border-2 shadow-2xl bg-gradient-to-b",
        kindStyle[card.kind],
        legendary ? "border-gold glow-gold" : "border-border",
        rareCard(card) && "arena-card-rare",
        className,
      )}
    >
      {card.imageUrl ? (
        <img
          src={card.imageUrl}
          alt={card.name}
          loading="lazy"
          className="absolute inset-0 h-full w-full object-cover"
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center p-2">
          <div className="absolute h-3/4 w-3/4 rounded-full border border-dashed border-primary/40 animate-rune" />
          <span className="px-2 text-center font-display text-[10px] text-muted-foreground">{card.name}</span>
        </div>
      )}
      {rareCard(card) && <span className="arena-card-foil" aria-hidden="true" />}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-background via-background/85 to-transparent p-2 pt-6">
        <p className="truncate font-display text-[11px] font-bold leading-tight">{card.name}</p>
        <div className="mt-0.5 flex items-center justify-between text-[9px] text-muted-foreground">
          <span>
            {card.kind === "monster"
              ? `${card.attribute ? (ATTRIBUTE_LABELS[card.attribute] ?? card.attribute) : ""}${card.level ? ` · ★${card.level}` : ""}`
              : card.kind === "spell"
                ? "Magia"
                : "Armadilha"}
          </span>
          {card.kind === "monster" && (
            <span className="font-bold text-foreground">
              {card.atk ?? "?"}/{card.def ?? "?"}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}
