import { Button } from "@/components/ui/button";
import type { CardData } from "@/data/catalog";
import { cn } from "@/lib/utils";
import classicBack from "@/assets/classic-card-back.png.asset.json";
import { rareCard } from "@/lib/duel-setup";
import type { ComponentProps } from "react";
import { CardLightning } from "@/components/arena/CardLightning";

export function CardBack({ className }: { className?: string }) {
  return <div className={cn("arena-card-back", className)} aria-hidden="true"><img src={classicBack.url} alt="" width={694} height={1013} /></div>;
}

export function ArenaCard({ card, hidden, selected, defensive, faceDown, onClick, className, label, attackValue, defenseValue, boosted, ...triggerProps }: {
  card: CardData | null; hidden?: boolean; selected?: boolean; defensive?: boolean; faceDown?: boolean;
  onClick?: (() => void) | undefined; className?: string; label?: string;
  attackValue?: number | undefined; defenseValue?: number | undefined; boosted?: boolean | undefined;
} & Omit<ComponentProps<typeof Button>, "children" | "onClick" | "className">) {
  return (
    <Button {...triggerProps} variant="ghost" type="button" onClick={onClick} aria-label={label ?? (hidden ? "Carta oculta do adversário" : faceDown ? "Sua carta virada para baixo" : card?.name ?? "Zona vazia")}
      className={cn("arena-card", card && !hidden && !faceDown && rareCard(card) && "arena-card-rare", selected && "arena-card-selected", defensive && "arena-card-defense", className)}>
      {hidden || faceDown ? <CardBack /> : card ? <>
        {card.imageUrl ? <img src={card.imageUrl} alt="" loading="lazy" width={295} height={430} /> : <span className="arena-card-placeholder">{card.name}</span>}
        {rareCard(card) && <CardLightning />}
        <span className="arena-card-name">{card.name}</span>
        {attackValue !== undefined && <span className="arena-card-stats"><b className={boosted ? "arena-atk-boosted" : undefined}>ATK {attackValue}{boosted ? " ↑" : ""}</b><small>DEF {defenseValue}</small></span>}
      </> : null}
    </Button>
  );
}