import { EyeOff, Hexagon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { CardData } from "@/data/catalog";
import { cn } from "@/lib/utils";

export function CardBack({ className }: { className?: string }) {
  return <div className={cn("arena-card-back", className)} aria-hidden="true"><div className="arena-card-back-ring"><Hexagon /><Hexagon /></div></div>;
}

export function ArenaCard({ card, hidden, selected, defensive, faceDown, onClick, className, label }: {
  card: CardData | null; hidden?: boolean; selected?: boolean; defensive?: boolean; faceDown?: boolean;
  onClick?: () => void; className?: string; label?: string;
}) {
  return (
    <Button variant="ghost" type="button" onClick={onClick} aria-label={label ?? (hidden ? "Carta oculta do adversário" : card?.name ?? "Zona vazia")}
      className={cn("arena-card", selected && "arena-card-selected", defensive && "arena-card-defense", className)}>
      {hidden ? <CardBack /> : card ? <>
        {card.imageUrl ? <img src={card.imageUrl} alt="" loading="lazy" width={295} height={430} /> : <span className="arena-card-placeholder">{card.name}</span>}
        <span className="arena-card-name">{card.name}</span>
        {faceDown && <EyeOff className="arena-facedown-icon" />}
      </> : null}
    </Button>
  );
}