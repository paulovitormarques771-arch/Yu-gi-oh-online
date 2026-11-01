import * as Dialog from "@radix-ui/react-dialog";
import { Link } from "@tanstack/react-router";
import { Home, RotateCcw, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArenaBackdrop } from "@/components/arena/ArenaBackdrop";
import type { CombatEvent } from "@/lib/arena-events";
import type { PlayerId } from "@/lib/duel-engine";

export function DamageAnnouncement({ event, view }: { event: CombatEvent | null; view: PlayerId }) {
  if (!event?.damages.length) return null;
  return <div key={event.id} className="arena-damage-screen" aria-live="polite">
    {event.damages.map((damage) => <div key={damage.owner} className={`arena-damage-number ${damage.owner === view ? "damage-own" : "damage-enemy"}`}>
      <span>{damage.owner === view ? "SEUS LP" : "LP DO OPONENTE"}</span>
      <strong>−{damage.amount}</strong><small>DANO</small>
    </div>)}
  </div>;
}

export function PhaseAnnouncement({ label, turn, player }: { label: string; turn: number; player: string }) {
  return <div className="arena-phase-announcement" role="status" aria-live="polite"><div><small>TURNO {turn} · {player}</small><strong>{label}</strong></div></div>;
}

export function DuelResult({ winner, onReplay }: { winner: boolean | null; onReplay: () => void }) {
  return <Dialog.Root open={winner !== null}>
    <Dialog.Portal>
      <Dialog.Overlay className="duel-result-overlay" />
      <Dialog.Content className={`duel-result ${winner ? "duel-result-victory" : "duel-result-defeat"}`} aria-describedby={undefined} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
        <ArenaBackdrop />
        <Trophy className="duel-result-trophy" aria-hidden="true" />
        <span className="duel-result-eyebrow">DUELO ENCERRADO</span>
        <Dialog.Title className="duel-result-title">{winner ? "VOCÊ VENCEU!" : "VOCÊ PERDEU!"}</Dialog.Title>
        <div className="duel-result-actions">
          <Button size="lg" className="duel-replay-button" onClick={onReplay}><RotateCcw />Jogar novamente</Button>
          <Button asChild size="lg" variant="outline"><Link to="/jogar"><Home />Voltar ao menu</Link></Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}