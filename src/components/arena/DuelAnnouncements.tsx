import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { Home, RotateCcw, Trophy, Sword, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArenaBackdrop } from "@/components/arena/ArenaBackdrop";
import type { CombatEvent } from "@/lib/arena-events";
import type { PlayerId } from "@/lib/duel-engine";
import type { FieldSpell } from "@/lib/duel-engine";
import { cardText } from "@/data/card-text";

export function DamageAnnouncement({ event, view }: { event: CombatEvent | null; view: PlayerId }) {
  if (!event?.damages.length) return null;
  return <div key={event.id} className="arena-damage-screen" aria-live="polite">
    {event.damages.map((damage) => <div key={damage.owner} className={`arena-damage-number ${damage.owner === view ? "damage-own" : "damage-enemy"}`}>
      <span>{damage.owner === view ? "SEUS LP" : "LP DO OPONENTE"}</span>
      <strong>−{damage.amount}</strong><small>DANO</small>
      <div className="arena-sword-cut arena-lp-cut" aria-hidden="true"><Sword className="arena-lp-sword" /></div>
    </div>)}
  </div>;
}

export function TrapConfirmation({ spells, onActivate, onPass }: { spells: FieldSpell[]; onActivate: (uid: string) => void; onPass: () => void }) {
  return <Dialog.Root open><Dialog.Portal>
    <Dialog.Overlay className="trap-confirm-overlay" />
    <Dialog.Content className="trap-confirm" aria-describedby={undefined} onEscapeKeyDown={(e) => { e.preventDefault(); onPass(); }} onPointerDownOutside={(e) => e.preventDefault()}>
      <Zap className="trap-confirm-icon" />
      <Dialog.Title>ATIVAR ARMADILHA?</Dialog.Title>
      <div className="trap-confirm-choices">{spells.map((spell) => <Button key={spell.uid} variant="outline" className="trap-confirm-card" onClick={() => onActivate(spell.uid)}>{spell.card.imageUrl && <img src={spell.card.imageUrl} alt="" />}<span><strong>{cardText(spell.card).name}</strong><small>Ativar</small></span><Zap /></Button>)}</div>
      <Button size="lg" variant="secondary" onClick={onPass}>Não ativar · continuar jogada</Button>
    </Dialog.Content>
  </Dialog.Portal></Dialog.Root>;
}

export function DuelOpening() {
  return <div className="arena-duel-opening" role="status" aria-live="assertive"><span>DUEL ARENA</span><strong>É HORA DO DUELO!</strong><div className="arena-opening-line" aria-hidden="true" /></div>;
}

export function PhaseAnnouncement({ label, turn, player }: { label: string; turn: number; player: string }) {
  return <div className="arena-phase-announcement" role="status" aria-live="polite"><div><small>TURNO {turn} · {player}</small><strong>{label}</strong></div></div>;
}

export function DuelResult({ winner, onReplay, canReplay = true }: { winner: boolean | null; onReplay: () => void; canReplay?: boolean }) {
  return <Dialog.Root open={winner !== null}>
    <Dialog.Portal>
      <Dialog.Overlay className="duel-result-overlay" />
      <Dialog.Content className={`duel-result ${winner ? "duel-result-victory" : "duel-result-defeat"}`} aria-describedby={undefined} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <ArenaBackdrop />
        <Trophy className="duel-result-trophy" aria-hidden="true" />
        <span className="duel-result-eyebrow">DUELO ENCERRADO</span>
        <Dialog.Title className="duel-result-title">{winner ? "VOCÊ VENCEU!" : "VOCÊ PERDEU!"}</Dialog.Title>
        <div className="duel-result-actions">
          <Button size="lg" className="duel-replay-button" disabled={!canReplay} onClick={onReplay}><RotateCcw />{canReplay ? "Jogar novamente" : "Aguardando o anfitrião"}</Button>
          <Button asChild size="lg" variant="outline"><Link to="/jogar"><Home />Voltar ao menu</Link></Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}