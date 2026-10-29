import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, Circle, Eye, Flag, Layers, RotateCcw, Shield, Sparkles, Swords, Zap } from "lucide-react";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CardZoom } from "@/components/arena/CardZoom";
import { ArenaBackdrop } from "@/components/arena/ArenaBackdrop";
import { ArenaCard } from "@/components/arena/ArenaCard";
import { ArenaHud } from "@/components/arena/ArenaHud";
import { CHARACTERS, type CardData } from "@/data/catalog";
import { ALL_CARDS } from "@/data/cards";
import { aiNextAction } from "@/lib/duel-ai";
import { finishTurn, inspectableCard } from "@/lib/arena-presentation";
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

const Field = lazy(() => import("@/components/arena/Battlefield3D").then((m) => ({ default: m.Battlefield3D })));
const PHASE_LABEL = { draw: "Compra", main1: "Principal 1", battle: "Batalha", main2: "Principal 2", end: "Final" } as const;

function newDuel(vsAI = false) {
  const seed = Date.now() % 100000;
  return createDuel(vsAI ? ["Você", "IA Duelista"] : ["Jogador 1", "Jogador 2"], [quickDeck(ALL_CARDS, seed), quickDeck(ALL_CARDS, seed + 99)], seed);
}

function Duelo() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="duel-screen"><ArenaBackdrop /></div>;
  return <Arena />;
}

function Arena() {
  const { roomId } = Route.useParams();
  const vsAI = roomId === "treino";
  const [s, setS] = useState<DuelState>(() => newDuel(vsAI));
  const [sel, setSel] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [zoom, setZoom] = useState<{ card: CardData; owner: string; uid?: string; location?: "hand" | "monster" | "enemy" } | null>(null);
  const [tributes, setTributes] = useState<string[]>([]);
  const [grave, setGrave] = useState<"own" | "enemy">("own");
  const logRef = useRef<HTMLDivElement>(null);
  const view: PlayerId = vsAI ? 0 : s.active;
  const opponentId: PlayerId = view === 0 ? 1 : 0;
  const me = s.players[view];
  const opponent = s.players[opponentId];
  const aiTurn = vsAI && s.active === 1 && s.winner === null;
  const playable = !aiTurn && s.winner === null;
  const main = s.phase === "main1" || s.phase === "main2";
  const selHand = me.hand.find((h) => h.uid === sel);
  const selMonster = me.monsters.find((m) => m?.uid === sel);
  const need = selHand?.card.kind === "monster" ? tributesNeeded(selHand.card.level) : 0;
  const canSummon = playable && main && !!selHand && selHand.card.kind === "monster" && !me.normalSummoned && tributes.length === need && (me.monsters.some((m) => !m) || need > 0) && !/Fusion|Ritual/.test(selHand.card.type ?? "");
  const canSet = playable && main && !!selHand && (selHand.card.kind === "monster" ? canSummon : me.spells.some((m) => !m));
  const attackReady = playable && !!selMonster && canAttack(s, selMonster) && (!opponent.monsters.some(Boolean) || !!target);
  const selectedCard = selHand?.card ?? selMonster?.card;

  useEffect(() => {
    if (!aiTurn) return;
    const timer = setTimeout(() => {
      setS((current) => { try { return applyAction(current, aiNextAction(current)); } catch { return applyAction(current, { type: "nextPhase" }); } });
    }, 700);
    return () => clearTimeout(timer);
  }, [aiTurn, s]);
  useEffect(() => { setSel(null); setTarget(null); setTributes([]); setZoom(null); }, [s.active]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [s.log.length]);

  const act = (action: Action) => {
    if (!playable) return;
    try { setS((current) => applyAction(current, action)); setSel(null); setTarget(null); setTributes([]); setZoom(null); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Ação indisponível."); }
  };
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const host = window as typeof window & { __arena?: { state: DuelState; act: (a: Action) => void } };
    host.__arena = { state: s, act };
    return () => { delete host.__arena; };
  }, [s, playable]);

  const toggleTribute = (uid: string) => {
    setTributes((current) => current.includes(uid) ? current.filter((x) => x !== uid) : [...current, uid].slice(0, need));
    setZoom(null);
  };
  const inspect = (card: CardData, enemy = false) => setZoom({ card, owner: enemy ? opponent.name : me.name });
  const attack = () => { if (selMonster && attackReady) act({ type: "attack", attackerUid: selMonster.uid, ...(target ? { targetUid: target } : {}) }); };
  const summon = (defense = false) => { if (selHand && canSummon) act({ type: "summon", handUid: selHand.uid, tributes, set: defense }); };
  const graveCards = grave === "own" ? me.graveyard : opponent.graveyard;
  const yugi = CHARACTERS.find((c) => c.id === "yugi-muto")?.imageUrl;
  const kaiba = CHARACTERS.find((c) => c.id === "seto-kaiba")?.imageUrl;
  const modalActions = zoom?.location === "hand" && playable ? <>
    {selHand?.card.kind === "monster" ? <>
      <Button disabled={!canSummon} onClick={() => summon()}><Sparkles />Invocar</Button>
      {need > 0 && !canSummon && <Button variant="outline" onClick={() => setZoom(null)}><Circle />Selecionar tributos ({tributes.length}/{need})</Button>}
      <Button variant="outline" disabled={!canSummon} onClick={() => summon(true)}><Shield />Baixar em defesa</Button>
    </> : <>
      {selHand?.card.kind === "spell" && <Button disabled={!main} onClick={() => { if (selHand) act({ type: "activateSpell", handUid: selHand.uid }); }}><Zap />Ativar</Button>}
      <Button variant="outline" disabled={!canSet} onClick={() => { if (selHand) act({ type: "setSpell", handUid: selHand.uid }); }}><Layers />Baixar</Button>
    </>}
    <Button variant="ghost" onClick={() => setZoom(null)}><ArrowRight />Voltar ao campo</Button>
  </> : zoom?.location === "monster" && need > 0 && zoom.uid && playable ? <Button onClick={() => { if (zoom.uid) toggleTribute(zoom.uid); }}><Circle />{tributes.includes(zoom.uid) ? "Remover tributo" : "Oferecer como tributo"}</Button>
    : zoom?.location === "enemy" && selMonster && playable && s.phase === "battle" ? <Button disabled={!attackReady} onClick={attack}><Swords />Atacar este monstro</Button> : undefined;

  return <div className="duel-screen">
    <ArenaBackdrop />
    <header className="arena-topbar">
      <Button asChild variant="ghost" size="sm"><Link to="/jogar"><ArrowLeft />Sair</Link></Button>
      <div className="arena-wordmark">DUEL <span>ARENA</span></div>
      <span className="arena-room-tag"><span className="arena-room-dot" />{vsAI ? "TREINO · IA" : `LOCAL · ${roomId.toUpperCase()}`}</span>
    </header>
    <main className="arena-dashboard">
      <div className="arena-score-row">
        <ArenaHud player={me} avatar={view === 0 ? yugi : kaiba} active={s.active === view} />
        <div className="arena-turn-display"><h1>ARENA DE DUELO</h1><strong>TURNO {String(s.turn).padStart(2, "0")}</strong><span>{aiTurn ? "IA JOGANDO…" : PHASE_LABEL[s.phase].toUpperCase()}</span></div>
        <ArenaHud player={opponent} avatar={view === 0 ? kaiba : yugi} enemy active={s.active === opponentId} />
      </div>
      <div className="arena-main-grid">
        <aside className="arena-left-rail">
          <h2 className="arena-rail-heading"><BookOpen size={14} />REGISTRO DO DUELO</h2>
          <div className="arena-log" ref={logRef}>{s.log.map((line, i) => <p key={i}><small>{String(i + 1).padStart(2, "0")}</small>{line}</p>)}</div>
          <div className="arena-selected-detail"><span>CARTA SELECIONADA</span>
            {selectedCard ? <><h3>{selectedCard.name}</h3><p>{selectedCard.kind === "monster" ? `ATK ${selectedCard.atk ?? "?"} / DEF ${selectedCard.def ?? "?"}` : selectedCard.kind === "spell" ? "Magia" : "Armadilha"}</p>
              <Button variant="outline" size="sm" className="arena-inspect-button" onClick={() => inspect(selectedCard)}><Eye />Ver carta</Button></> : <p>—</p>}
            {need > 0 && <p>TRIBUTOS: {tributes.length} / {need}</p>}
          </div>
        </aside>
        <section className="arena-stage" aria-label="Campo de batalha">
          <div className="arena-opponent-hand" aria-label={`Mão adversária: ${opponent.hand.length} cartas ocultas`}>
            {opponent.hand.map((h) => <ArenaCard key={h.uid} card={inspectableCard(h.card, opponentId, view, "hand")} hidden onClick={() => toast("Carta oculta", { description: "A mão adversária permanece oculta." })} />)}
          </div>
          <Suspense fallback={<div className="battlefield-scene" />}><Field me={me} opponent={opponent} selected={sel} tributes={tributes} target={target} canDraw={playable && s.phase === "draw"} onDraw={() => act({ type: "draw" })}
            onOwnCard={(uid, card) => { if (need === 0) { setSel(uid); setTarget(null); } setZoom({ card, owner: me.name, uid, location: "monster" }); }}
            onOpponentCard={(uid, card) => { if (selMonster) setTarget(uid); if (card) setZoom({ card, owner: opponent.name, uid, location: "enemy" }); else toast("Monstro virado para baixo", { description: "A identidade será revelada durante a batalha." }); }}
            onInspect={inspect} /></Suspense>
          <div className="arena-phase-track">{Object.entries(PHASE_LABEL).filter(([key]) => key !== "end").map(([key, label]) => <span key={key} className={key === s.phase ? "current" : ""}>{label}</span>)}</div>
          <div className="arena-hand-heading"><strong>SUA MÃO · {me.hand.length} CARTAS</strong><span>BARALHO {me.deck.length} · CEMITÉRIO {me.graveyard.length}</span></div>
          <div className="arena-hand">{me.hand.map((h) => <ArenaCard key={h.uid} card={h.card} selected={sel === h.uid} onClick={() => { setSel(h.uid); setTarget(null); setTributes([]); setZoom({ card: h.card, owner: me.name, uid: h.uid, location: "hand" }); }} />)}</div>
        </section>
        <aside className="arena-right-rail">
          <h2 className="arena-rail-heading"><Swords size={14} />{s.winner !== null ? "DUELO ENCERRADO" : "COMANDOS DO DUELISTA"}</h2>
          {s.winner !== null ? <div className="arena-actions"><p className="text-center font-bold text-gold">{s.players[s.winner].name} venceu!</p><Button className="arena-action arena-action-main" onClick={() => { setS(newDuel(vsAI)); setSel(null); setZoom(null); setTarget(null); setTributes([]); }}><RotateCcw />Novo duelo</Button></div> : <>
            <div className="arena-actions">
              {s.phase === "draw" && <Button className="arena-action arena-action-main" disabled={!playable} onClick={() => act({ type: "draw" })}><Layers />Comprar carta</Button>}
              <Button className="arena-action arena-action-main" disabled={!playable || s.phase === "draw"} onClick={() => { setS((current) => finishTurn(current)); setSel(null); setTarget(null); setTributes([]); setZoom(null); }}><ArrowRight />Fim de Turno</Button>
              <Button className="arena-action" disabled={!canSummon} onClick={() => summon()}><Sparkles />Invocação</Button>
              <Button className="arena-action" disabled={!playable || !main || selHand?.card.kind !== "spell"} onClick={() => { if (selHand) act({ type: "activateSpell", handUid: selHand.uid }); }}><Zap />Ativar</Button>
              <Button className="arena-action" disabled={!attackReady} onClick={attack}><Swords />{target ? "Atacar alvo" : "Atacar"}</Button>
              <Button className="arena-action" disabled={!canSet} onClick={() => { if (!selHand) return; if (selHand.card.kind === "monster") summon(true); else act({ type: "setSpell", handUid: selHand.uid }); }}><Shield />Baixar carta</Button>
              {selMonster && <Button className="arena-action" disabled={!playable || !main || selMonster.summonedTurn === s.turn} onClick={() => act({ type: "changePosition", uid: selMonster.uid })}><RotateCcw />Mudar posição</Button>}
            </div>
            <div className="arena-minor-actions"><Button variant="outline" disabled={!playable || s.phase === "draw"} onClick={() => act({ type: "nextPhase" })}><ChevronRight />Próxima fase</Button><Button variant="ghost" size="icon" aria-label="Desistir do duelo" title="Desistir do duelo" disabled={!playable} onClick={() => { if (window.confirm("Desistir deste duelo?")) act({ type: "surrender" }); }}><Flag /></Button></div>
          </>}
          <h2 className="arena-rail-heading"><Layers size={14} />CEMITÉRIO · {graveCards.length}</h2>
          <div className="arena-graveyard"><div className="arena-graveyard-tabs"><Button size="sm" variant={grave === "own" ? "secondary" : "ghost"} aria-pressed={grave === "own"} onClick={() => setGrave("own")}>Seu ({me.graveyard.length})</Button><Button size="sm" variant={grave === "enemy" ? "secondary" : "ghost"} aria-pressed={grave === "enemy"} onClick={() => setGrave("enemy")}>Oponente ({opponent.graveyard.length})</Button></div>
            {graveCards.length ? <div className="arena-graveyard-cards">{graveCards.map((card, i) => <ArenaCard key={`${card.id}-${i}`} card={card} onClick={() => inspect(card, grave === "enemy")} />)}</div> : <div className="arena-empty-grave">Nenhuma carta</div>}
          </div>
        </aside>
      </div>
      <footer className="arena-footer"><span>● {vsAI ? "TREINO CONTRA IA" : "DUELO LOCAL"}</span><span>{aiTurn ? "TURNO DO OPONENTE" : `TURNO DE ${s.players[s.active].name.toUpperCase()}`}</span><span>DUEL ARENA · PROJETO DE FÃS</span></footer>
    </main>
    <CardZoom card={zoom?.card ?? null} owner={zoom?.owner} onClose={() => setZoom(null)} actions={modalActions} />
  </div>;
}
