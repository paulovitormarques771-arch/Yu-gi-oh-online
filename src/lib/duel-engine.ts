// Pure duel rules engine (classic simplified rules). No UI, no randomness inside
// reducers except via the seeded shuffle used at setup.
import type { CardData } from "@/data/catalog";

export const START_LP = 8000;
export const START_HAND = 5;
export const MONSTER_ZONES = 5;
export const SPELL_ZONES = 5;

export type Phase = "draw" | "main1" | "battle" | "main2" | "end";
export type PlayerId = 0 | 1;

export interface FieldMonster { uid: string; card: CardData; position: "atk" | "def"; faceDown: boolean; attacked: boolean; summonedTurn: number }
export interface FieldSpell { uid: string; card: CardData; faceDown: boolean }
export interface PlayerState {
  name: string; lp: number;
  deck: { uid: string; card: CardData }[];
  hand: { uid: string; card: CardData }[];
  monsters: (FieldMonster | null)[];
  spells: (FieldSpell | null)[];
  graveyard: CardData[];
  normalSummoned: boolean;
}
export interface DuelState { players: [PlayerState, PlayerState]; turn: number; active: PlayerId; phase: Phase; winner: PlayerId | null; log: string[] }

export type Action =
  | { type: "draw" }
  | { type: "nextPhase" }
  | { type: "summon"; handUid: string; tributes?: string[]; set?: boolean }
  | { type: "setSpell"; handUid: string }
  | { type: "activateSpell"; handUid: string }
  | { type: "changePosition"; uid: string }
  | { type: "attack"; attackerUid: string; targetUid?: string }
  | { type: "surrender" };

export const tributesNeeded = (level = 0) => (level >= 7 ? 2 : level >= 5 ? 1 : 0);
const atk = (c: CardData) => c.atk ?? 0;
const def = (c: CardData) => c.def ?? 0;

export function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]; let s = seed || 1;
  for (let i = a.length - 1; i > 0; i--) { s = (s * 16807) % 2147483647; const j = s % (i + 1); [a[i], a[j]] = [a[j]!, a[i]!]; }
  return a;
}

function makePlayer(name: string, deck: CardData[], p: number, seed: number): PlayerState {
  const d = shuffle(deck, seed).map((card, i) => ({ uid: `p${p}-${i}`, card }));
  return { name, lp: START_LP, deck: d.slice(START_HAND), hand: d.slice(0, START_HAND), monsters: Array(MONSTER_ZONES).fill(null), spells: Array(SPELL_ZONES).fill(null), graveyard: [], normalSummoned: false };
}

export function createDuel(names: [string, string], decks: [CardData[], CardData[]], seed = Date.now()): DuelState {
  return { players: [makePlayer(names[0], decks[0], 0, seed), makePlayer(names[1], decks[1], 1, seed + 7)], turn: 1, active: 0, phase: "main1", winner: null, log: [`Duelo iniciado. Turno 1 de ${names[0]}.`] };
}

const clone = (s: DuelState): DuelState => structuredClone(s);
const PHASES: Phase[] = ["draw", "main1", "battle", "main2", "end"];

function checkWin(s: DuelState) {
  s.players.forEach((p, i) => { if (p.lp <= 0 && s.winner === null) { p.lp = 0; s.winner = (1 - i) as PlayerId; s.log.push(`${s.players[1 - i]!.name} venceu o duelo!`); } });
}

export function canAttack(s: DuelState, m: FieldMonster) {
  return s.phase === "battle" && s.turn > 1 && m.position === "atk" && !m.faceDown && !m.attacked;
}

export function applyAction(state: DuelState, action: Action): DuelState {
  if (state.winner !== null) return state;
  const s = clone(state);
  const me = s.players[s.active]; const opp = s.players[(1 - s.active) as PlayerId];
  const err = (m: string) => { throw new Error(m); };

  switch (action.type) {
    case "surrender": s.winner = (1 - s.active) as PlayerId; s.log.push(`${me.name} desistiu.`); return s;
    case "draw": {
      if (s.phase !== "draw") err("Só é possível comprar na Fase de Compra.");
      const c = me.deck.shift();
      if (!c) { s.winner = (1 - s.active) as PlayerId; s.log.push(`${me.name} não tem cartas para comprar e perdeu.`); return s; }
      me.hand.push(c); s.phase = "main1"; s.log.push(`${me.name} comprou uma carta.`); return s;
    }
    case "nextPhase": {
      if (s.phase === "draw") err("Compre uma carta primeiro.");
      let next = PHASES[PHASES.indexOf(s.phase) + 1]!;
      if (next === "battle" && s.turn === 1) next = "main2";
      if (next === "end") {
        while (me.hand.length > 6) { const c = me.hand.pop()!; me.graveyard.push(c.card); }
        s.active = (1 - s.active) as PlayerId; s.turn += 1; s.phase = "draw";
        const n = s.players[s.active]; n.normalSummoned = false;
        n.monsters.forEach((m) => m && (m.attacked = false));
        s.log.push(`Turno ${s.turn}: ${n.name}.`);
        return s;
      }
      s.phase = next; return s;
    }
    case "summon": {
      if (s.phase !== "main1" && s.phase !== "main2") err("Invoque apenas nas Fases Principais.");
      if (me.normalSummoned) err("Você já fez uma Invocação Normal neste turno.");
      const hi = me.hand.findIndex((h) => h.uid === action.handUid); const h = me.hand[hi];
      if (!h || h.card.kind !== "monster") err("Carta inválida.");
      if ((h!.card.type ?? "").match(/Fusion|Ritual/)) err("Monstros de Fusão/Ritual não podem ser Invocados normalmente.");
      const need = tributesNeeded(h!.card.level); const tr = action.tributes ?? [];
      if (tr.length !== need) err(`Este monstro exige ${need} tributo(s).`);
      for (const t of tr) { const i = me.monsters.findIndex((m) => m?.uid === t); if (i < 0) err("Tributo inválido."); me.graveyard.push(me.monsters[i]!.card); me.monsters[i] = null; }
      const zone = me.monsters.findIndex((m) => m === null); if (zone < 0) err("Sem zona de monstro livre.");
      me.hand.splice(hi, 1);
      me.monsters[zone] = { uid: h!.uid, card: h!.card, position: action.set ? "def" : "atk", faceDown: !!action.set, attacked: false, summonedTurn: s.turn };
      me.normalSummoned = true;
      s.log.push(action.set ? `${me.name} baixou um monstro.` : `${me.name} invocou ${h!.card.name}.`);
      return s;
    }
    case "setSpell":
    case "activateSpell": {
      if (s.phase !== "main1" && s.phase !== "main2") err("Use magias/armadilhas nas Fases Principais.");
      const hi = me.hand.findIndex((h) => h.uid === action.handUid); const h = me.hand[hi];
      if (!h || h.card.kind === "monster") err("Carta inválida.");
      if (action.type === "activateSpell") {
        if (h!.card.kind !== "spell") err("Armadilhas devem ser baixadas antes.");
        me.hand.splice(hi, 1); me.graveyard.push(h!.card); s.log.push(`${me.name} ativou ${h!.card.name}.`); return s;
      }
      const zone = me.spells.findIndex((x) => x === null); if (zone < 0) err("Sem zona de magia/armadilha livre.");
      me.hand.splice(hi, 1); me.spells[zone] = { uid: h!.uid, card: h!.card, faceDown: true }; s.log.push(`${me.name} baixou uma carta.`); return s;
    }
    case "changePosition": {
      if (s.phase !== "main1" && s.phase !== "main2") err("Mude posições nas Fases Principais.");
      const m = me.monsters.find((x) => x?.uid === action.uid); if (!m) err("Monstro inválido.");
      if (m!.summonedTurn === s.turn) err("Não é possível mudar a posição no turno em que foi colocado.");
      m!.position = m!.position === "atk" ? "def" : "atk"; m!.faceDown = false; m!.summonedTurn = s.turn; return s;
    }
    case "attack": {
      const ai = me.monsters.findIndex((x) => x?.uid === action.attackerUid); const a = me.monsters[ai];
      if (!a || !canAttack(s, a)) err("Este monstro não pode atacar agora.");
      a!.attacked = true;
      const hasMonsters = opp.monsters.some(Boolean);
      if (!action.targetUid) {
        if (hasMonsters) err("O oponente tem monstros: escolha um alvo.");
        opp.lp -= atk(a!.card); s.log.push(`${a!.card.name} atacou diretamente: ${atk(a!.card)} de dano.`); checkWin(s); return s;
      }
      const ti = opp.monsters.findIndex((x) => x?.uid === action.targetUid); const t = opp.monsters[ti];
      if (!t) err("Alvo inválido.");
      t!.faceDown = false;
      const A = atk(a!.card);
      if (t!.position === "atk") {
        const T = atk(t!.card);
        if (A > T) { opp.lp -= A - T; opp.graveyard.push(t!.card); opp.monsters[ti] = null; }
        else if (A < T) { me.lp -= T - A; me.graveyard.push(a!.card); me.monsters[ai] = null; }
        else { opp.graveyard.push(t!.card); opp.monsters[ti] = null; me.graveyard.push(a!.card); me.monsters[ai] = null; }
      } else {
        const D = def(t!.card);
        if (A > D) { opp.graveyard.push(t!.card); opp.monsters[ti] = null; }
        else if (A < D) me.lp -= D - A;
      }
      s.log.push(`${a!.card.name} atacou ${t!.card.name}.`); checkWin(s); return s;
    }
  }
}

/** Builds a playable 40-card deck from a pool, favouring low-level monsters. */
export function quickDeck(pool: CardData[], seed: number): CardData[] {
  const mons = shuffle(pool.filter((c) => c.kind === "monster" && !(c.type ?? "").match(/Fusion|Ritual/) && (c.atk ?? 0) > 0), seed);
  const low = mons.filter((c) => (c.level ?? 0) <= 4).slice(0, 26);
  const high = mons.filter((c) => (c.level ?? 0) > 4).slice(0, 6);
  const st = shuffle(pool.filter((c) => c.kind !== "monster"), seed + 1).slice(0, 8);
  return [...low, ...high, ...st];
}
