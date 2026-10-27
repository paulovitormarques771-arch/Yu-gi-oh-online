import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft, Flag, RotateCcw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { ALL_CARDS } from "@/data/cards";
import { DuelCard } from "@/components/arena/DuelCard";
import { MagicBackdrop } from "@/components/arena/MagicBackdrop";
import { applyAction, canAttack, createDuel, quickDeck, tributesNeeded, type Action, type DuelState, type PlayerId } from "@/lib/duel-engine";

export const Route = createFileRoute("/duelo/$roomId")({
  head: ({ params }) => ({
    meta: [
      { title: `Arena de Duelo · ${params.roomId} — Duel Arena` },
      { name: "description", content: "Arena de batalha do Duel Arena: invoque, ataque e reduza os LP do oponente a zero." },
      { property: "og:title", content: "Arena de Duelo — Duel Arena" },
      { property: "og:description", content: "Você foi desafiado para um duelo!" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Duelo,
});

const PHASE_LABEL = { draw: "Compra", main1: "Principal 1", battle: "Batalha", main2: "Principal 2", end: "Final" } as const;

function newDuel() {
  const seed = Date.now() % 100000;
  return createDuel(["Jogador 1", "Jogador 2"], [quickDeck(ALL_CARDS, seed), quickDeck(ALL_CARDS, seed + 99)], seed);
}

function Duelo() {
  const { roomId } = Route.useParams();
  const [s, setS] = useState<DuelState>(newDuel);
  const [sel, setSel] = useState<string | null>(null); // hand card or attacker uid
  const [tributes, setTributes] = useState<string[]>([]);
  const me = s.players[s.active];
  const oppId = (1 - s.active) as PlayerId;
  const opp = s.players[oppId];

  const act = (a: Action) => {
    try { setS(applyAction(s, a)); setSel(null); setTributes([]); }
    catch (e) { toast.error((e as Error).message); }
  };
  const selHand = me.hand.find((h) => h.uid === sel);
  const selAttacker = me.monsters.find((m) => m?.uid === sel);
  const need = selHand?.card.kind === "monster" ? tributesNeeded(selHand.card.level) : 0;

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <MagicBackdrop />
      <div className="flex items-center justify-between gap-2 p-4">
        <Link to="/jogar" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Sair</Link>
        <p className="font-display text-sm tracking-widest text-gold">SALA {roomId.toUpperCase()} · TURNO {s.turn}</p>
        <Lp name={opp.name} lp={opp.lp} deck={opp.deck.length} hand={opp.hand.length} enemy />
      </div>

      <div className="perspective-arena flex flex-1 items-center justify-center px-4">
        <div className="w-full max-w-2xl space-y-3 rounded-2xl border border-primary/40 bg-card/30 p-4 glow-primary" style={{ transform: "rotateX(18deg)" }}>
          <Row zones={opp.spells.map((x) => x && { faceDown: true, card: x.card })} enemy />
          <Row enemy zones={opp.monsters.map((m) => m && { faceDown: m.faceDown, card: m.card, def: m.position === "def" })}
            onPick={(i) => { const t = opp.monsters[i]; if (selAttacker && t) act({ type: "attack", attackerUid: selAttacker.uid, targetUid: t.uid }); }}
            highlight={!!selAttacker} />
          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-energy" />
            <span className="font-display text-xs text-gold">{PHASE_LABEL[s.phase].toUpperCase()}</span>
            <div className="h-px flex-1 bg-energy" />
          </div>
          <Row zones={me.monsters.map((m) => m && { faceDown: false, card: m.card, def: m.position === "def", dim: m.faceDown, selected: sel === m.uid || tributes.includes(m.uid) })}
            onPick={(i) => {
              const m = me.monsters[i]; if (!m) return;
              if (need > 0) setTributes((t) => t.includes(m.uid) ? t.filter((x) => x !== m.uid) : [...t, m.uid].slice(0, need));
              else setSel(sel === m.uid ? null : m.uid);
            }} />
          <Row zones={me.spells.map((x) => x && { faceDown: false, card: x.card, dim: true })} />
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="flex flex-wrap items-center justify-center gap-2">
          {s.winner !== null ? (
            <>
              <p className="font-display text-xl text-gold">{s.players[s.winner].name} venceu!</p>
              <Btn onClick={() => setS(newDuel())}><RotateCcw className="h-4 w-4" /> Novo duelo</Btn>
            </>
          ) : s.phase === "draw" ? (
            <Btn primary onClick={() => act({ type: "draw" })}>Comprar carta ({me.name})</Btn>
          ) : (
            <>
              {selHand?.card.kind === "monster" && (
                <>
                  <Btn primary onClick={() => act({ type: "summon", handUid: selHand.uid, tributes })}>Invocar{need ? ` (${tributes.length}/${need} tributos)` : ""}</Btn>
                  <Btn onClick={() => act({ type: "summon", handUid: selHand.uid, tributes, set: true })}>Baixar em defesa</Btn>
                </>
              )}
              {selHand && selHand.card.kind !== "monster" && (
                <>
                  {selHand.card.kind === "spell" && <Btn primary onClick={() => act({ type: "activateSpell", handUid: selHand.uid })}>Ativar</Btn>}
                  <Btn onClick={() => act({ type: "setSpell", handUid: selHand.uid })}>Baixar</Btn>
                </>
              )}
              {selAttacker && s.phase === "battle" && canAttack(s, selAttacker) && !opp.monsters.some(Boolean) && (
                <Btn primary onClick={() => act({ type: "attack", attackerUid: selAttacker.uid })}>Ataque direto</Btn>
              )}
              {selAttacker && s.phase === "battle" && opp.monsters.some(Boolean) && <span className="text-sm text-primary">Escolha um monstro do oponente como alvo</span>}
              {selAttacker && (s.phase === "main1" || s.phase === "main2") && <Btn onClick={() => act({ type: "changePosition", uid: selAttacker.uid })}>Mudar posição</Btn>}
              <Btn onClick={() => act({ type: "nextPhase" })}>{s.phase === "main2" || (s.phase === "main1" && s.turn === 1 && false) ? "Encerrar turno" : "Próxima fase"}</Btn>
              <Btn onClick={() => act({ type: "surrender" })}><Flag className="h-4 w-4" /> Desistir</Btn>
            </>
          )}
        </div>
        <div className="flex items-end justify-between gap-4">
          <Lp name={me.name} lp={me.lp} deck={me.deck.length} hand={me.hand.length} />
          <div className="flex -space-x-8 overflow-x-auto pb-2">
            {me.hand.map((h, i) => (
              <motion.button key={h.uid} initial={{ y: 120 }} animate={{ y: sel === h.uid ? -24 : 0 }} transition={{ delay: i * 0.03 }}
                onClick={() => { setSel(sel === h.uid ? null : h.uid); setTributes([]); }} aria-label={h.card.name}>
                <DuelCard card={h.card} interactive={false} className={`w-20 md:w-28 ${sel === h.uid ? "border-gold glow-gold" : ""}`} />
              </motion.button>
            ))}
          </div>
          <div className="hidden max-h-24 w-56 overflow-y-auto text-right text-xs text-muted-foreground md:block">
            {s.log.slice(-6).reverse().map((l, i) => <p key={i}>{l}</p>)}
          </div>
        </div>
      </div>
    </div>
  );
}

type Zone = { faceDown: boolean; card: import("@/data/catalog").CardData; def?: boolean; dim?: boolean; selected?: boolean } | null;

function Row({ zones, enemy, onPick, highlight }: { zones: Zone[]; enemy?: boolean; onPick?: (i: number) => void; highlight?: boolean }) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {zones.map((z, i) => (
        <button key={i} type="button" onClick={() => onPick?.(i)}
          className={`relative flex aspect-[59/86] items-center justify-center rounded border ${enemy ? "border-destructive/50" : "border-primary/60"} bg-background/40 ${highlight && z ? "ring-2 ring-destructive" : ""} ${z?.selected ? "ring-2 ring-gold" : ""}`}>
          {z && (z.faceDown ? (
            <div className={`h-full w-full rounded bg-magic/40 ${z.def ? "rotate-90 scale-75" : ""}`} />
          ) : (
            <div className={`${z.def ? "rotate-90 scale-75" : ""} ${z.dim ? "opacity-60" : ""} w-full`}>
              <DuelCard card={z.card} interactive={false} className="w-full" />
            </div>
          ))}
        </button>
      ))}
    </div>
  );
}

function Lp({ name, lp, deck, hand, enemy }: { name: string; lp: number; deck: number; hand: number; enemy?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card/80 px-4 py-2 backdrop-blur">
      <p className="font-display text-xs text-muted-foreground">{name} · deck {deck} · mão {hand}</p>
      <p className={`font-display text-2xl font-black ${enemy ? "text-destructive" : "text-primary"}`}>LP {lp}</p>
    </div>
  );
}

function Btn({ children, onClick, primary }: { children: React.ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <button onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-md px-4 py-2 font-display text-sm font-bold ${primary ? "bg-energy text-primary-foreground glow-primary" : "border border-border bg-card"}`}>
      {children}
    </button>
  );
}
