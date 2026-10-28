import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { useEffect } from "react";
import { ATTRIBUTE_LABELS, type CardData } from "@/data/catalog";

const KIND_LABEL = { monster: "Monstro", spell: "Magia", trap: "Armadilha" } as const;

/** Full-screen card viewer with large image and legible details. */
export function CardZoom({ card, owner, onClose }: { card: CardData | null; owner?: string; onClose: () => void }) {
  useEffect(() => {
    if (!card) return;
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [card, onClose]);

  return (
    <AnimatePresence>
      {card && (
        <motion.div key="zoom" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
          role="dialog" aria-modal aria-label={card.name}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/85 p-4 backdrop-blur-md">
          <motion.div initial={{ scale: 0.6, rotateY: -30 }} animate={{ scale: 1, rotateY: 0 }} exit={{ scale: 0.7, opacity: 0 }}
            transition={{ type: "spring", damping: 18 }} onClick={(e) => e.stopPropagation()}
            className="relative flex max-h-[92vh] w-full max-w-4xl flex-col gap-6 overflow-y-auto rounded-2xl border border-primary/50 bg-card/95 p-5 glow-primary md:flex-row">
            <button onClick={onClose} aria-label="Fechar" className="absolute right-3 top-3 rounded-full border border-border bg-background/70 p-2 hover:border-primary">
              <X className="h-5 w-5" />
            </button>
            <div className="mx-auto w-64 shrink-0 md:w-80">
              {card.imageUrl ? (
                <img src={card.imageUrl} alt={card.name} className="w-full rounded-lg glow-gold" />
              ) : (
                <div className="flex aspect-[59/86] items-center justify-center rounded-lg bg-secondary p-4 text-center font-display">{card.name}</div>
              )}
            </div>
            <div className="flex-1 space-y-4 pr-6">
              {owner && <p className="font-display text-xs tracking-[0.3em] text-primary">{owner.toUpperCase()}</p>}
              <h2 className="text-2xl font-black md:text-3xl">{card.name}</h2>
              <div className="flex flex-wrap gap-2 text-sm">
                <Tag>{KIND_LABEL[card.kind]}</Tag>
                {card.type && <Tag>{card.type}</Tag>}
                {card.race && <Tag>{card.race}</Tag>}
                {card.attribute && <Tag>{ATTRIBUTE_LABELS[card.attribute] ?? card.attribute}</Tag>}
                {card.level ? <Tag>Nível {card.level}</Tag> : null}
              </div>
              {card.kind === "monster" && (
                <div className="flex gap-4">
                  <Stat label="ATK" value={card.atk} />
                  <Stat label="DEF" value={card.def} />
                </div>
              )}
              <p className="whitespace-pre-line rounded-lg border border-border bg-background/60 p-4 text-base leading-relaxed">{card.desc}</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return <span className="rounded border border-border bg-secondary px-2 py-0.5">{children}</span>;
}
function Stat({ label, value }: { label: string; value?: number | null }) {
  return (
    <div className="rounded-lg border border-gold/50 bg-background/60 px-4 py-2 text-center">
      <p className="font-display text-xs text-gold">{label}</p>
      <p className="text-2xl font-black">{value ?? "?"}</p>
    </div>
  );
}
