import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ATTRIBUTE_LABELS, type CardData } from "@/data/catalog";
import { cardText, CARD_TYPE_PT } from "@/data/card-text";
import { effectStatus } from "@/lib/duel-effects";

const KIND_LABEL = { monster: "Monstro", spell: "Magia", trap: "Armadilha" } as const;

/** Full-screen card viewer with large image and legible details. */
export function CardZoom({ card, owner, onClose, actions }: { card: CardData | null; owner?: string | undefined; onClose: () => void; actions?: React.ReactNode }) {
  return <Dialog.Root open={!!card} onOpenChange={(open) => { if (!open) onClose(); }}>
    {card && <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-background/85 backdrop-blur-md" />
      <Dialog.Content className="card-inspector-content fixed left-1/2 top-1/2 z-50 -translate-x-1/2 -translate-y-1/2" aria-describedby={undefined}>
        <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Fechar carta" className="absolute right-2 top-2"><X /></Button></Dialog.Close>
        <div className="card-inspector-layout">
          {card.imageUrl ? <img src={card.imageUrl} alt={card.name} width={295} height={430} className="card-inspector-image" /> : <div className="flex aspect-[59/86] items-center justify-center bg-secondary p-4 text-center font-display">{card.name}</div>}
          <div className="min-w-0 space-y-4">
            {owner && <p className="text-xs font-bold text-arena-cyan">{owner.toUpperCase()}</p>}
            <Dialog.Title className="card-inspector-name font-display font-bold">{cardText(card).name}</Dialog.Title>
            {cardText(card).name !== card.name && <p className="text-sm text-muted-foreground">{card.name}</p>}
            <div className="flex flex-wrap gap-2 text-sm">
              <Tag>{KIND_LABEL[card.kind]}</Tag>{card.type && <Tag>{CARD_TYPE_PT[card.type] ?? card.type}</Tag>}{card.race && <Tag>{CARD_TYPE_PT[card.race] ?? card.race}</Tag>}
              {card.attribute && <Tag>{ATTRIBUTE_LABELS[card.attribute] ?? card.attribute}</Tag>}{card.level ? <Tag>Nível {card.level}</Tag> : null}
            </div>
            {card.kind === "monster" && <div className="flex gap-4"><Stat label="ATK" value={card.atk} /><Stat label="DEF" value={card.def} /></div>}
            <p className="card-inspector-detail" lang="pt-BR">{cardText(card).desc}</p>
            <p className="text-xs text-muted-foreground">{effectStatus(card)}</p>
            {actions && <div className="card-inspector-actions">{actions}</div>}
          </div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>}
  </Dialog.Root>;
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded border border-border bg-secondary px-2 py-0.5">{children}</span>;
}
function Stat({ label, value }: { label: string; value?: number | null | undefined }) {
  return (
    <div className="rounded-lg border border-gold/50 bg-background/60 px-4 py-2 text-center">
      <p className="font-display text-xs text-gold">{label}</p>
      <p className="text-2xl font-black">{value ?? "?"}</p>
    </div>
  );
}
