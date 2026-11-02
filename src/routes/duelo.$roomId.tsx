import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, BookOpen, ChevronRight, Circle, Eye, Flag, Layers, RotateCcw, Shield, Sparkles, Swords, Zap, X } from "lucide-react";
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
import { fieldCardCommands, finishTurn, inspectableCard } from "@/lib/arena-presentation";
import { supabase } from "@/integrations/supabase/client";
import { OnlineRoom } from "@/components/arena/OnlineRoom";
import { isRoomCode } from "@/lib/online-room";
import type { Json } from "@/integrations/supabase/types";
import { applyAction, availableResponses, canAttack, choiceCard, createDuel, decisionPlayer, monsterAtk, monsterDef, quickDeck, tributesNeeded, type Action, type DuelState, type PlayerId } from "@/lib/duel-engine";
import { effectFor } from "@/lib/duel-effects";
import { cardText } from "@/data/card-text";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DamageAnnouncement, DuelOpening, DuelResult, PhaseAnnouncement } from "@/components/arena/DuelAnnouncements";
import { combatEvent, rareSummonEvent, type CombatEvent, type RareSummonEvent } from "@/lib/arena-events";
import { DuelSetup, type DuelSelection } from "@/components/arena/DuelSetup";
import { isPreparation, type RoomState } from "@/lib/duel-setup";
import { DIFFICULTY_LABELS, emptyPlaystyle, isDifficulty, observePlaystyle, readPlaystyle, TRAINING_PROFILE_KEY, trainingDeck, type AIDifficulty } from "@/lib/duel-training";

export const Route = createFileRoute("/duelo/$roomId")({
  validateSearch: (search: Record<string, unknown>): { difficulty?: AIDifficulty } => isDifficulty(search['difficulty']) ? { difficulty: search['difficulty'] } : {},
  head: () => ({
    meta: [
      { title: "Arena de Duelo — Duel Arena" },
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

function newDuel(vsAI = false, names?: [string, string], difficulty: AIDifficulty = "normal", chosen?: DuelSelection) {
  const seed = Date.now() % 100000;
  return createDuel(names ?? (vsAI ? ["Você", `IA · ${DIFFICULTY_LABELS[difficulty]}`] : ["Jogador 1", "Jogador 2"]), [chosen?.deck ?? quickDeck(ALL_CARDS, seed), vsAI ? trainingDeck(ALL_CARDS, seed + 99, difficulty) : chosen?.opponentDeck ?? quickDeck(ALL_CARDS, seed + 99)], seed);
}

function Duelo() {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <div className="duel-screen"><ArenaBackdrop /></div>;
  return <ArenaEntry />;
}

function ArenaEntry() {
  const { roomId } = Route.useParams();
  const search = Route.useSearch();
  const [selection, setSelection] = useState<DuelSelection | null>(null);
  const [preparedDifficulty, setPreparedDifficulty] = useState<AIDifficulty>(search.difficulty ?? "normal");
  if (isRoomCode(roomId)) return <OnlineRoom roomId={roomId} createState={createOnlineDuel} render={(online) => <Arena online={online} />} />;
  if (!selection) return <DuelSetup vsAI={roomId === "treino"} local={roomId !== "treino"} initialDifficulty={preparedDifficulty} onStart={setSelection} />;
  return <Arena selection={selection} onPrepare={(level) => { setPreparedDifficulty(level); setSelection(null); }} />;
}

const createOnlineDuel = (names: [string, string], decks: [CardData[], CardData[]]) => createDuel(names, decks);

export interface OnlineSeat { roomId: string; seat: PlayerId; initial: DuelState; names: [string, string] }

function Arena({ online, selection, onPrepare }: { online?: OnlineSeat; selection?: DuelSelection; onPrepare?: (level: AIDifficulty) => void }) {
  const { roomId } = Route.useParams();
  const vsAI = roomId === "treino";
  const search = Route.useSearch();
  const [difficulty, setDifficulty] = useState<AIDifficulty>(selection?.difficulty ?? search.difficulty ?? "normal");
  const [s, setS] = useState<DuelState>(() => online?.initial ?? newDuel(vsAI, undefined, difficulty, selection));
  const [opening, setOpening] = useState(() => s.turn === 1 && s.log.length === 1 && s.players.every((p) => !p.monsters.some(Boolean) && !p.spells.some(Boolean)));
  const [summonEvent, setSummonEvent] = useState<RareSummonEvent | null>(null);
  const [attackStep, setAttackStep] = useState<"attacker" | "target" | null>(null);
  const [tributeMode, setTributeMode] = useState(false);
  const [combat, setCombat] = useState<CombatEvent | null>(null);
  const [phaseNotice, setPhaseNotice] = useState<{ label: string; turn: number; player: string } | null>(null);
  const previous = useRef(s);
  const eventId = useRef(0);
  const profile = useRef(emptyPlaystyle());
  useEffect(() => { try { profile.current = readPlaystyle(localStorage.getItem(TRAINING_PROFILE_KEY)); } catch { /* Optional local adaptation. */ } }, []);
  const commit = (next: DuelState) => {
    setS(next);
    if (online) void supabase.from("duel_rooms").update({ state: next as unknown as Json, status: next.winner !== null ? "finished" : "playing" }).eq("id", online.roomId).then(({ error }) => { if (error) toast.error("Falha ao sincronizar a jogada."); });
  };
  useEffect(() => {
    if (!online) return;
    const channel = supabase.channel(`room-${online.roomId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "duel_rooms", filter: `id=eq.${online.roomId}` }, (payload) => {
        const next = (payload.new as { state: RoomState | null }).state;
        if (next && !isPreparation(next)) setS(next);
      }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [online?.roomId]);
  const [sel, setSel] = useState<string | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [zoom, setZoom] = useState<{ card: CardData; owner: string; uid?: string; location?: "hand" | "monster" | "enemy" | "spell" } | null>(null);
  const [tributes, setTributes] = useState<string[]>([]);
  const [grave, setGrave] = useState<"own" | "enemy">("own");
  const logRef = useRef<HTMLDivElement>(null);
  const view: PlayerId = online ? online.seat : vsAI ? 0 : decisionPlayer(s);
  const opponentId: PlayerId = view === 0 ? 1 : 0;
  const me = s.players[view];
  const opponent = s.players[opponentId];
  const aiTurn = vsAI && decisionPlayer(s) === 1 && s.winner === null;
  const playable = !opening && !aiTurn && s.winner === null && decisionPlayer(s) === view;
  const main = s.phase === "main1" || s.phase === "main2";
  const selHand = me.hand.find((h) => h.uid === sel);
  const selMonster = me.monsters.find((m) => m?.uid === sel);
  const selSpell = me.spells.find((m) => m?.uid === sel);
  const activateReady = playable && !s.pending && main && (selHand?.card.kind === "spell" && effectFor(selHand.card)?.timing === "main" || selSpell?.card.kind === "spell" && selSpell.faceDown && effectFor(selSpell.card)?.timing === "main");
  const need = selHand?.card.kind === "monster" ? tributesNeeded(selHand.card.level) : 0;
  const canSummon = playable && !s.pending && main && !!selHand && selHand.card.kind === "monster" && !me.normalSummoned && tributes.length === need && (me.monsters.some((m) => !m) || need > 0) && !/Fusion|Ritual/.test(selHand.card.type ?? "");
  const canSet = playable && !s.pending && main && !!selHand && (selHand.card.kind === "monster" ? canSummon : me.spells.some((m) => !m));
  const attackReady = playable && !!selMonster && canAttack(s, selMonster) && (!opponent.monsters.some(Boolean) || !!target);
  const attackers = playable && !s.pending ? me.monsters.flatMap((m) => m && canAttack(s, m) ? [m.uid] : []) : [];
  const selectedCard = selHand?.card ?? selMonster?.card ?? selSpell?.card;

  useEffect(() => {
    if (!aiTurn || opening) return;
    const timer = setTimeout(() => {
      setS((current) => { try { return applyAction(current, aiNextAction(current, difficulty, profile.current)); } catch { return current; } });
    }, 1900);
    return () => clearTimeout(timer);
  }, [aiTurn, s, difficulty, opening]);
  useEffect(() => { if (!opening) return; const timer = setTimeout(() => setOpening(false), 2300); return () => clearTimeout(timer); }, [opening]);
  useEffect(() => {
    const before = previous.current; previous.current = s;
    if (before === s) return;
    const event = combatEvent(before, s, ++eventId.current);
    if (event) { setCombat(event); }
    const summoned = rareSummonEvent(before, s, eventId.current);
    if (summoned) setSummonEvent(summoned);
    if (before.phase !== s.phase || before.turn !== s.turn) {
      if (s.winner === null) setPhaseNotice({ label: `FASE ${PHASE_LABEL[s.phase].toUpperCase()}`, turn: s.turn, player: s.players[s.active].name });
      setAttackStep(null); setTributeMode(false);
    }
  }, [s]);
  useEffect(() => {
    if (!combat) return;
    const timer = setTimeout(() => setCombat(null), 1600);
    return () => clearTimeout(timer);
  }, [combat]);
  useEffect(() => { if (!summonEvent) return; const timer = setTimeout(() => setSummonEvent(null), 1800); return () => clearTimeout(timer); }, [summonEvent]);
  useEffect(() => {
    if (!phaseNotice) return;
    const timer = setTimeout(() => setPhaseNotice(null), 1450);
    return () => clearTimeout(timer);
  }, [phaseNotice]);
  useEffect(() => { setSel(null); setTarget(null); setTributes([]); setZoom(null); setAttackStep(null); setTributeMode(false); }, [s.active]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [s.log.length]);

  const act = (action: Action) => {
    if (!playable) return;
    try {
      const move = { ...action, actor: view };
      const next = applyAction(s, move);
      if (vsAI) {
        profile.current = observePlaystyle(profile.current, s, move);
        try { localStorage.setItem(TRAINING_PROFILE_KEY, JSON.stringify(profile.current)); } catch { /* Play remains available without storage. */ }
      }
      commit(next); setSel(null); setTarget(null); setTributes([]); setZoom(null); setAttackStep(null); setTributeMode(false);
    }
    catch (error) { toast.error(error instanceof Error ? error.message : "Ação indisponível."); }
  };
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const host = window as typeof window & { __arena?: { state: DuelState; act: (a: Action) => void; load: (state: DuelState) => void; aiStep: () => void } };
    host.__arena = { state: s, act, load: setS, aiStep: () => setS((current) => applyAction(current, aiNextAction(current, difficulty, profile.current))) };
    return () => { delete host.__arena; };
  }, [s, playable, difficulty]);

  const toggleTribute = (uid: string) => {
    setTributes((current) => current.includes(uid) ? current.filter((x) => x !== uid) : [...current, uid].slice(0, need));
    setZoom(null);
  };
  const inspect = (card: CardData, enemy = false) => setZoom({ card, owner: enemy ? opponent.name : me.name });
  const attack = () => { if (selMonster && attackReady) act({ type: "attack", attackerUid: selMonster.uid, ...(target ? { targetUid: target } : {}) }); };
  const summon = (defense = false) => { if (selHand && canSummon) act({ type: "summon", handUid: selHand.uid, tributes, set: defense }); };
  const replay = (level = difficulty) => {
    if (online) { if (online.seat === 0) void supabase.from("duel_rooms").update({ state: { kind: "setup", decks: [null, null] } as unknown as Json, status: "ready" }).eq("id", online.roomId).then(({ error }) => { if (error) toast.error("Não foi possível preparar a revanche."); }); return; }
    if (onPrepare) { onPrepare(level); return; }
    setDifficulty(level); commit(newDuel(vsAI, undefined, level, selection)); setOpening(true); setSel(null); setZoom(null); setTarget(null); setTributes([]); setAttackStep(null); setTributeMode(false); setCombat(null); setPhaseNotice(null);
  };
  const beginAttack = () => { setZoom(null); setTributeMode(false); setTributes([]); setSel(null); setTarget(null); setAttackStep("attacker"); };
  const activate = () => { if (!activateReady) return; if (selHand) act({ type: "activateSpell", handUid: selHand.uid }); else if (selSpell) act({ type: "activateField", uid: selSpell.uid }); };
  const displayMonsterCard = (owner: PlayerId, card: CardData, id?: string) => {
    const monster = s.players[owner].monsters.find((m) => m?.uid === id);
    return monster ? { ...card, atk: monsterAtk(s, owner, monster), def: monsterDef(s, owner, monster) } : card;
  };
  const graveCards = grave === "own" ? me.graveyard : opponent.graveyard;
  const yugi = CHARACTERS.find((c) => c.id === "yugi-muto")?.imageUrl;
  const kaiba = CHARACTERS.find((c) => c.id === "seto-kaiba")?.imageUrl;
  const modalActions = zoom?.location === "hand" && playable ? <>
    {selHand?.card.kind === "monster" ? <>
      <Button disabled={!canSummon} onClick={() => summon()}><Sparkles />Invocar</Button>
      {need > 0 && !canSummon && <Button variant="outline" onClick={() => { setZoom(null); setTributeMode(true); }}><Circle />Sacrificar monstros ({tributes.length}/{need})</Button>}
      <Button variant="outline" disabled={!canSummon} onClick={() => summon(true)}><Shield />Baixar em defesa</Button>
    </> : <>
      {selHand?.card.kind === "spell" && <Button disabled={!activateReady} onClick={activate}><Zap />Ativar</Button>}
      <Button variant="outline" disabled={!canSet} onClick={() => { if (selHand) act({ type: "setSpell", handUid: selHand.uid }); }}><Layers />Baixar</Button>
    </>}
    <Button variant="ghost" onClick={() => setZoom(null)}><ArrowRight />Voltar ao campo</Button>
  </> : zoom?.location === "monster" && need > 0 && zoom.uid && playable ? <Button onClick={() => { if (zoom.uid) toggleTribute(zoom.uid); }}><Circle />{tributes.includes(zoom.uid) ? "Remover tributo" : "Oferecer como tributo"}</Button>
    : zoom?.location === "spell" && playable ? <Button disabled={!activateReady} onClick={activate}><Zap />Ativar</Button>
    : zoom?.location === "enemy" && selMonster && playable && s.phase === "battle" ? <Button disabled={!attackReady} onClick={attack}><Swords />Atacar este monstro</Button> : undefined;

  return <div className={`duel-screen ${combat?.damages.some((d) => d.owner === view) ? "arena-taking-damage" : ""}`}>
    <ArenaBackdrop />
    <header className="arena-topbar">
      <Button asChild variant="ghost" size="sm"><Link to="/jogar"><ArrowLeft />Sair</Link></Button>
      <div className="arena-wordmark">DUEL <span>ARENA</span></div>
      <span className="arena-room-tag"><span className="arena-room-dot" />{vsAI ? `TREINO · IA ${DIFFICULTY_LABELS[difficulty].toUpperCase()}` : `${online ? "ONLINE" : "LOCAL"} · ${roomId.toUpperCase()}`}</span>
    </header>
    <main className="arena-dashboard">
      <div className="arena-score-row">
        <ArenaHud player={me} avatar={view === 0 ? yugi : kaiba} active={s.active === view} damage={combat?.damages.find((d) => d.owner === view)?.amount} hitId={combat?.id} />
        <div className="arena-turn-display"><h1>ARENA DE DUELO</h1><strong>TURNO {String(s.turn).padStart(2, "0")}</strong><span>{aiTurn ? "IA JOGANDO…" : s.pending ? "EFEITO / RESPOSTA" : online && s.active !== online.seat ? "VEZ DO OPONENTE" : PHASE_LABEL[s.phase].toUpperCase()}</span></div>
        <ArenaHud player={opponent} avatar={view === 0 ? kaiba : yugi} enemy active={s.active === opponentId} damage={combat?.damages.find((d) => d.owner === opponentId)?.amount} hitId={combat?.id} />
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
          {(attackStep || tributeMode) && <div className="arena-selection-prompt" role="status"><strong>{attackStep === "attacker" ? "Selecione seu monstro para atacar" : attackStep === "target" ? opponent.monsters.some(Boolean) ? "Selecione o monstro adversário" : "Ataque direto aos LP disponível" : `Sacrifícios: ${tributes.length} / ${need}`}</strong><Button variant="ghost" size="icon" aria-label="Cancelar seleção" onClick={() => { setAttackStep(null); setTributeMode(false); setTarget(null); }}><X /></Button></div>}
          <div className="arena-opponent-hand" aria-label={`Mão adversária: ${opponent.hand.length} cartas ocultas`}>
            {opponent.hand.map((h) => <ArenaCard key={h.uid} card={inspectableCard(h.card, opponentId, view, "hand")} hidden onClick={() => toast("Carta oculta", { description: "A mão adversária permanece oculta." })} />)}
          </div>
          <Suspense fallback={<div className="battlefield-scene" />}><Field me={me} opponent={opponent} selected={sel} tributes={tributes} target={target} combat={combat} summon={summonEvent} viewer={view} attackers={attackStep === "attacker" ? attackers : []} choosingTributes={tributeMode} canDraw={playable && s.phase === "draw"} onDraw={() => act({ type: "draw" })}
            cardMenu={(uid, enemy) => {
              const commands = fieldCardCommands(s, enemy ? opponentId : view, view, uid);
              return { attack: playable && commands.attack, toAttack: playable && commands.toAttack, toDefense: playable && commands.toDefense,
                onAttack: () => { if (!playable || !commands.attack) return; setZoom(null); setTributeMode(false); setTributes([]); setSel(uid); setTarget(null); setAttackStep("target"); },
                onPosition: (position) => { if (position === "atk" ? commands.toAttack : commands.toDefense) act({ type: "changePosition", uid }); } };
            }}
            onOwnCard={(uid, card) => {
              if (attackStep) { if (!attackers.includes(uid)) { toast.error("Este monstro não pode atacar agora."); return; } setSel(uid); setTarget(null); setAttackStep("target"); setZoom(null); return; }
              if (tributeMode && need > 0) { toggleTribute(uid); return; }
              if (need === 0) { setSel(uid); setTarget(null); }
              setZoom({ card: displayMonsterCard(view, card, uid), owner: me.name, uid, location: "monster" });
            }}
            onOwnSpell={(uid, card) => { setSel(uid); setZoom({ card, owner: me.name, uid, location: "spell" }); }}
            onOpponentCard={(uid, card) => { if (attackStep === "target" && selMonster && playable) { setTarget(uid); setZoom(null); return; } if (playable && selMonster && s.phase === "battle") setTarget(uid); if (card) setZoom({ card: displayMonsterCard(opponentId, card, uid), owner: opponent.name, uid, location: "enemy" }); else toast("Monstro virado para baixo", { description: "A identidade será revelada durante a batalha." }); }}
            onInspect={inspect} /></Suspense>
          <div className="arena-phase-track">{Object.entries(PHASE_LABEL).filter(([key]) => key !== "end").map(([key, label]) => <span key={key} className={key === s.phase ? "current" : ""}>{label}</span>)}</div>
          <div className="arena-hand-heading"><strong>SUA MÃO · {me.hand.length} CARTAS</strong><span>BARALHO {me.deck.length} · CEMITÉRIO {me.graveyard.length}</span></div>
          <div className="arena-hand">{me.hand.map((h) => <ArenaCard key={h.uid} card={h.card} selected={sel === h.uid} onClick={() => { setSel(h.uid); setTarget(null); setTributes([]); setAttackStep(null); setTributeMode(false); setZoom({ card: h.card, owner: me.name, uid: h.uid, location: "hand" }); }} />)}</div>
        </section>
        <aside className="arena-right-rail">
          <h2 className="arena-rail-heading"><Swords size={14} />{s.winner !== null ? "DUELO ENCERRADO" : "COMANDOS DO DUELISTA"}</h2>
          {vsAI && <ToggleGroup type="single" value={difficulty} aria-label="Dificuldade da IA" className="arena-difficulty" onValueChange={(value) => { if (!isDifficulty(value) || value === difficulty) return; if (window.confirm("Trocar a dificuldade e iniciar um novo duelo?")) replay(value); }}>{Object.entries(DIFFICULTY_LABELS).map(([value, label]) => <ToggleGroupItem key={value} value={value}>{label}</ToggleGroupItem>)}</ToggleGroup>}
          {s.pending && <section className="arena-effect-panel" aria-label="Efeito pendente">
            <h3>{s.pending.kind === "effect" ? cardText(s.pending.sourceCard).name : "Responder à jogada"}</h3>
            {playable ? <>
              <div className="arena-effect-targets">
                {s.pending.kind === "effect" ? s.pending.choices.map((choice, i) => {
                  const card = choiceCard(s, choice);
                  const fieldCard = choice.zone === "graveyard" ? null : (choice.zone === "monster" ? s.players[choice.owner].monsters : s.players[choice.owner].spells).find((c) => c?.uid === choice.uid);
                  const hidden = choice.owner !== view && !!fieldCard?.faceDown;
                  return <ArenaCard key={i} card={hidden ? null : card} hidden={hidden} label={hidden ? `Selecionar carta oculta ${i + 1}` : `Selecionar ${card ? cardText(card).name : "alvo"}`} onClick={() => act({ type: "resolveEffect", choice })} />;
                }) : availableResponses(s).map((spell) => <Button key={spell.uid} variant="outline" onClick={() => act({ type: "activateField", uid: spell.uid })}><Zap />{cardText(spell.card).name}</Button>)}
              </div>
              {s.pending.kind === "response" ? <Button variant="outline" onClick={() => act({ type: "passResponse" })}>Não ativar armadilha</Button> : s.pending.sourceZone !== "monster" && <Button variant="ghost" onClick={() => act({ type: "cancelEffect" })}>Cancelar ativação</Button>}
            </> : <p className="text-sm text-muted-foreground">Aguardando {s.players[s.pending.actor].name}.</p>}
          </section>}
          {s.winner !== null ? null : <>
            <div className="arena-actions">
              {s.phase === "draw" && <Button className="arena-action arena-action-main" disabled={!playable} onClick={() => act({ type: "draw" })}><Layers />Comprar carta</Button>}
              <Button className="arena-action arena-action-main" disabled={!playable || !!s.pending || s.phase === "draw"} onClick={() => { commit(finishTurn(s)); setSel(null); setTarget(null); setTributes([]); setZoom(null); }}><ArrowRight />Fim de Turno</Button>
              <Button className={`arena-action arena-summon-action ${canSummon ? "arena-summon-ready" : ""}`} disabled={!canSummon} onClick={() => summon()}><Sparkles />{canSummon ? "INVOCAR MONSTRO" : "Invocar monstro"}</Button>
              {need > 0 && <Button className="arena-action" disabled={!playable || !!s.pending || !main || me.normalSummoned} onClick={() => { setZoom(null); setTributeMode(true); setAttackStep(null); }}><Circle />Sacrificar ({tributes.length}/{need})</Button>}
              <Button className="arena-action" disabled={!activateReady} onClick={activate}><Zap />Ativar</Button>
              <Button className="arena-action" disabled={attackStep === "target" ? !attackReady : !attackers.length} onClick={attackStep === "target" ? attack : beginAttack}><Swords />{attackStep === "target" ? target ? "Confirmar ataque" : "Atacar LP diretamente" : "Atacar"}</Button>
              <Button className="arena-action" disabled={!canSet} onClick={() => { if (!selHand) return; if (selHand.card.kind === "monster") summon(true); else act({ type: "setSpell", handUid: selHand.uid }); }}><Shield />Baixar carta</Button>
              {selMonster && <Button className="arena-action" disabled={!playable || !(fieldCardCommands(s, view, view, selMonster.uid).toAttack || fieldCardCommands(s, view, view, selMonster.uid).toDefense)} onClick={() => act({ type: "changePosition", uid: selMonster.uid })}><RotateCcw />Mudar posição</Button>}
            </div>
            <Button className="arena-next-phase" disabled={!playable || !!s.pending || s.phase === "draw"} onClick={() => act({ type: "nextPhase" })}><ChevronRight />PRÓXIMA FASE</Button>
            <div className="arena-minor-actions"><Button variant="ghost" size="icon" aria-label="Desistir do duelo" title="Desistir do duelo" disabled={!playable} onClick={() => { if (window.confirm("Desistir deste duelo?")) act({ type: "surrender" }); }}><Flag /></Button></div>
          </>}
          <h2 className="arena-rail-heading"><Layers size={14} />CEMITÉRIO · {graveCards.length}</h2>
          <div className="arena-graveyard"><div className="arena-graveyard-tabs"><Button size="sm" variant={grave === "own" ? "secondary" : "ghost"} aria-pressed={grave === "own"} onClick={() => setGrave("own")}>Seu ({me.graveyard.length})</Button><Button size="sm" variant={grave === "enemy" ? "secondary" : "ghost"} aria-pressed={grave === "enemy"} onClick={() => setGrave("enemy")}>Oponente ({opponent.graveyard.length})</Button></div>
            {graveCards.length ? <div className="arena-graveyard-cards">{graveCards.map((card, i) => <ArenaCard key={`${card.id}-${i}`} card={card} onClick={() => inspect(card, grave === "enemy")} />)}</div> : <div className="arena-empty-grave">Nenhuma carta</div>}
          </div>
        </aside>
      </div>
      <footer className="arena-footer"><span>● {vsAI ? "TREINO CONTRA IA" : online ? "DUELO ONLINE" : "DUELO LOCAL"}</span><span>{aiTurn ? "TURNO DO OPONENTE" : `TURNO DE ${s.players[s.active].name.toUpperCase()}`}</span><span>DUEL ARENA · PROJETO DE FÃS</span></footer>
    </main>
    <CardZoom card={zoom?.card ?? null} owner={zoom?.owner} onClose={() => setZoom(null)} actions={modalActions} />
    {opening && <DuelOpening />}
    {s.winner === null && phaseNotice && <PhaseAnnouncement key={`${phaseNotice.turn}-${phaseNotice.label}`} {...phaseNotice} />}
    <DamageAnnouncement event={combat} view={view} />
    <DuelResult winner={s.winner === null ? null : s.winner === (online ? online.seat : 0)} canReplay={!online || online.seat === 0} onReplay={() => replay()} />
  </div>;
}
