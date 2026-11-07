import * as Dialog from "@radix-ui/react-dialog";
import { Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cardText } from "@/data/card-text";
import { choiceCard, type DuelState, type EffectChoice, type PlayerId } from "@/lib/duel-engine";

export function GraveyardEffectDialog({ state, viewer, onChoose, onCancel }: {
  state: DuelState; viewer: PlayerId; onChoose: (choice: EffectChoice) => void; onCancel: () => void;
}) {
  const pending = state.pending;
  if (pending?.kind !== "effect" || pending.actor !== viewer || pending.stage === "cost" || !pending.choices.some((choice) => choice.zone === "graveyard")) return null;
  const opponent: PlayerId = viewer === 0 ? 1 : 0;
  return <Dialog.Root open modal={false}>
    <Dialog.Portal>
      <div className="grave-effect-shade" aria-hidden="true" />
      <Dialog.Content className="grave-effect-dialog" aria-describedby={undefined} onEscapeKeyDown={(event) => { event.preventDefault(); onCancel(); }} onPointerDownOutside={(event) => event.preventDefault()}>
        <header><div><span>ESCOLHA DO CEMITÉRIO</span><Dialog.Title>{cardText(pending.sourceCard).name}</Dialog.Title></div><Button size="icon" variant="ghost" aria-label="Cancelar ativação" onClick={onCancel}><X /></Button></header>
        <div className="grave-effect-groups">{([viewer, opponent] as const).map((owner) => {
          const choices = pending.choices.filter((choice) => choice.zone === "graveyard" && choice.owner === owner);
          return <section key={owner} aria-label={owner === viewer ? "Seu cemitério" : "Cemitério do oponente"}>
            <h3>{owner === viewer ? "Seu cemitério" : "Cemitério do oponente"} <small>{choices.length}</small></h3>
            <div className="grave-effect-choices">{choices.map((choice) => {
              const card = choiceCard(state, choice);
              if (!card) return null;
              const name = cardText(card).name;
              return <Button key={choice.index} variant="outline" className="grave-effect-choice" aria-label={`Selecionar ${name} do ${owner === viewer ? "seu cemitério" : "cemitério do oponente"}`} onClick={() => onChoose(choice)}>
                {card.imageUrl && <img src={card.imageUrl} alt="" width={68} height={99} />}
                <span><strong>{name}</strong><small>{card.kind === "monster" ? `ATK ${card.atk ?? 0} / DEF ${card.def ?? 0}` : "Magia"}</small><b><Sparkles />{pending.sourceCard.id === 83764718 ? "Invocar no seu campo" : "Selecionar"}</b></span>
              </Button>;
            })}</div>
            {!choices.length && <p>Nenhum alvo válido</p>}
          </section>;
        })}</div>
        <footer><Button variant="ghost" onClick={onCancel}>Cancelar ativação</Button></footer>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}