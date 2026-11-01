// Deterministic simplified duel rules. Explicit effects only; no execution of card text.
import type { CardData } from "@/data/catalog";
import { effectFor, hasPlayableEffect } from "@/lib/duel-effects";

export const START_LP = 8000;
export const START_HAND = 5;
export const MONSTER_ZONES = 5;
export const SPELL_ZONES = 5;
export type Phase = "draw" | "main1" | "battle" | "main2" | "end";
export type PlayerId = 0 | 1;
export interface FieldMonster { uid: string; card: CardData; position: "atk" | "def"; faceDown: boolean; attacked: boolean; summonedTurn: number; boost?: number }
export interface FieldSpell { uid: string; card: CardData; faceDown: boolean; setTurn?: number; targetUid?: string; targetOwner?: PlayerId; expiresTurn?: number }
export interface PlayerState {
  name: string; lp: number; deck: { uid: string; card: CardData }[]; hand: { uid: string; card: CardData }[];
  monsters: (FieldMonster | null)[]; spells: (FieldSpell | null)[]; graveyard: CardData[]; normalSummoned: boolean;
}
export type EffectChoice = { owner: PlayerId; zone: "monster" | "spell" | "graveyard"; uid?: string; index?: number };
export type AttackContext = { owner: PlayerId; attackerUid: string; targetUid?: string };
export type PendingDecision =
  | { kind: "response"; actor: PlayerId; event: "attack" | "summon"; sourcePlayer: PlayerId; attack?: AttackContext; summonedUid?: string }
  | { kind: "effect"; actor: PlayerId; sourceUid: string; sourceCard: CardData; sourceZone: "hand" | "spell" | "monster"; choices: EffectChoice[]; afterAttack?: AttackContext };
export interface DuelState { players: [PlayerState, PlayerState]; turn: number; active: PlayerId; phase: Phase; winner: PlayerId | null; log: string[]; pending?: PendingDecision | null; nextUid?: number; lastBattle?: AttackContext & { sequence: number } }
type Move =
  | { type: "draw" } | { type: "nextPhase" }
  | { type: "summon"; handUid: string; tributes?: string[]; set?: boolean }
  | { type: "setSpell"; handUid: string }
  | { type: "activateSpell"; handUid: string }
  | { type: "activateField"; uid: string }
  | { type: "resolveEffect"; choice: EffectChoice }
  | { type: "cancelEffect" } | { type: "passResponse" }
  | { type: "changePosition"; uid: string }
  | { type: "attack"; attackerUid: string; targetUid?: string }
  | { type: "surrender" };
export type Action = Move & { actor?: PlayerId };
const other = (p: PlayerId): PlayerId => p === 0 ? 1 : 0;
export const tributesNeeded = (level = 0) => level >= 8 ? 3 : level >= 6 ? 2 : level >= 5 ? 1 : 0;
function fail(message: string): never { throw new Error(message); }
const mainPhase = (s: DuelState) => s.phase === "main1" || s.phase === "main2";
export const decisionPlayer = (s: DuelState) => s.pending?.actor ?? s.active;

export function shuffle<T>(arr: T[], seed: number): T[] {
  const a = [...arr]; let r = seed || 1;
  for (let i = a.length - 1; i > 0; i--) {
    r = (r * 16807) % 2147483647; const j = r % (i + 1);
    const x = a[i], y = a[j]; if (x !== undefined && y !== undefined) { a[i] = y; a[j] = x; }
  }
  return a;
}
function makePlayer(name: string, deck: CardData[], p: number, seed: number): PlayerState {
  const d = shuffle(deck, seed).map((card, i) => ({ uid: `p${p}-${i}`, card }));
  return { name, lp: START_LP, deck: d.slice(START_HAND), hand: d.slice(0, START_HAND), monsters: Array(MONSTER_ZONES).fill(null), spells: Array(SPELL_ZONES).fill(null), graveyard: [], normalSummoned: false };
}
export function createDuel(names: [string, string], decks: [CardData[], CardData[]], seed = Date.now()): DuelState {
  const s: DuelState = { players: [makePlayer(names[0], decks[0], 0, seed), makePlayer(names[1], decks[1], 1, seed + 7)], turn: 1, active: 0, phase: "main1", winner: null, pending: null, nextUid: 0, log: [`Duelo iniciado. Turno 1 de ${names[0]}.`] };
  checkWin(s); return s;
}
function uid(s: DuelState) { s.nextUid = (s.nextUid ?? 0) + 1; return `effect-${s.turn}-${s.nextUid}`; }
function checkWin(s: DuelState) {
  for (const owner of [0, 1] as const) {
    const p = s.players[owner];
    if (p.lp <= 0 && s.winner === null) { p.lp = 0; s.winner = other(owner); s.log.push(`${s.players[other(owner)].name} venceu o duelo!`); }
    const pieces = [33396948, 7902349, 70903634, 44519536, 8124921];
    if (s.winner === null && pieces.every((id) => p.hand.some((h) => h.card.id === id))) { s.winner = owner; s.log.push(`${p.name} reuniu Exodia e venceu!`); }
  }
  if (s.winner !== null) s.pending = null;
}
function drawCards(s: DuelState, owner: PlayerId, count: number) {
  for (let i = 0; i < count && s.winner === null; i++) {
    const h = s.players[owner].deck.shift();
    if (!h) { s.winner = other(owner); s.pending = null; s.log.push(`${s.players[owner].name} não tem cartas para comprar e perdeu.`); return; }
    s.players[owner].hand.push(h);
  }
  checkWin(s);
}
function destroyMonster(s: DuelState, owner: PlayerId, index: number) {
  const m = s.players[owner].monsters[index]; if (!m) return;
  s.players[owner].graveyard.push(m.card); s.players[owner].monsters[index] = null;
  for (const p of s.players) p.spells.forEach((spell, i) => {
    if (spell?.targetUid === m.uid) { p.graveyard.push(spell.card); p.spells[i] = null; }
  });
}
function destroySpell(s: DuelState, owner: PlayerId, index: number) {
  const spell = s.players[owner].spells[index]; if (!spell) return;
  s.players[owner].graveyard.push(spell.card); s.players[owner].spells[index] = null;
}
export function monsterAtk(s: DuelState, owner: PlayerId, m: FieldMonster) {
  let value = m.card.id === 10000020 ? s.players[owner].hand.length * 1000 : m.card.atk ?? 0;
  if (m.card.id === 38033121) value += s.players.flatMap((p) => p.graveyard).filter((c) => c.id === 46986414 || c.id === 40737112).length * 300;
  value += m.boost ?? 0;
  for (const p of s.players) for (const spell of p.spells) {
    if (!spell || spell.faceDown) continue;
    if (spell.card.id === 40619825 && spell.targetUid === m.uid) value += 1000;
    if (spell.card.id === 48179391 && p === s.players[owner]) value += 500;
  }
  return Math.max(0, value);
}
export function monsterDef(s: DuelState, owner: PlayerId, m: FieldMonster) {
  return m.card.id === 10000020 ? s.players[owner].hand.length * 1000 : m.card.def ?? 0;
}
export function canAttack(s: DuelState, m: FieldMonster) {
  const blocked = s.players[other(s.active)].spells.some((x) => x && !x.faceDown && x.card.id === 72302403);
  return !s.pending && !blocked && s.winner === null && s.phase === "battle" && s.turn > 1 && m.position === "atk" && !m.faceDown && !m.attacked;
}
export function effectChoices(s: DuelState, owner: PlayerId, card: CardData, sourceUid?: string): EffectChoice[] {
  const target = effectFor(card)?.target; const list: EffectChoice[] = [];
  for (const p of [0, 1] as const) {
    if (target === "monster" || target === "enemyMonster" && p !== owner || target === "ownMonster" && p === owner)
      s.players[p].monsters.forEach((m) => { if (m && (card.id !== 40619825 || !m.faceDown) && !(card.id === 54652250 && m.uid === sourceUid)) list.push({ owner: p, zone: "monster", uid: m.uid }); });
    if (target === "graveMonster" || target === "graveSpell" && p === owner) s.players[p].graveyard.forEach((c, i) => {
      if (target === "graveMonster" && c.kind === "monster" && !/Fusion|Ritual/.test(c.type ?? "") || target === "graveSpell" && c.kind === "spell") list.push({ owner: p, zone: "graveyard", index: i });
    });
    if (target === "spellTrap") s.players[p].spells.forEach((spell) => { if (spell && spell.uid !== sourceUid) list.push({ owner: p, zone: "spell", uid: spell.uid }); });
  }
  return list;
}
export function choiceCard(s: DuelState, choice: EffectChoice): CardData | null {
  const p = s.players[choice.owner];
  if (choice.zone === "graveyard") return choice.index === undefined ? null : p.graveyard[choice.index] ?? null;
  const zones = choice.zone === "monster" ? p.monsters : p.spells;
  return zones.find((c) => c?.uid === choice.uid)?.card ?? null;
}
function sameChoice(a: EffectChoice, b: EffectChoice) { return a.owner === b.owner && a.zone === b.zone && a.uid === b.uid && a.index === b.index; }
export function availableResponses(s: DuelState): FieldSpell[] {
  const pending = s.pending; if (!pending || pending.kind !== "response") return [];
  return s.players[pending.actor].spells.filter((spell): spell is FieldSpell => {
    if (!spell || !spell.faceDown || spell.setTurn === undefined || spell.setTurn >= s.turn) return false;
    const effect = effectFor(spell.card); if (effect?.timing !== pending.event) return false;
    if (effect.operation === "trapHole") {
      const m = s.players[pending.sourcePlayer].monsters.find((x) => x?.uid === pending.summonedUid);
      return !!m && !m.faceDown && monsterAtk(s, pending.sourcePlayer, m) >= 1000;
    }
    return true;
  });
}
function responseWindow(s: DuelState, event: "attack" | "summon", sourcePlayer: PlayerId, attack?: AttackContext, summonedUid?: string) {
  s.pending = { kind: "response", actor: other(sourcePlayer), sourcePlayer, event, ...(attack ? { attack } : {}), ...(summonedUid ? { summonedUid } : {}) };
  if (availableResponses(s).length === 0) { s.pending = null; if (attack) resolveBattle(s, attack); }
}
function startEffect(s: DuelState, owner: PlayerId, sourceCard: CardData, sourceUid: string, sourceZone: "hand" | "spell" | "monster", afterAttack?: AttackContext) {
  const effect = effectFor(sourceCard); if (!effect) fail("O efeito desta carta ainda não foi implementado.");
  if (sourceCard.id === 83764718 && !s.players[owner].monsters.some((m) => m === null)) fail("Sem zona de monstro livre.");
  if (effect.continuous && sourceZone === "hand" && !s.players[owner].spells.some((m) => m === null)) fail("Sem zona de magia livre.");
  const choices = effectChoices(s, owner, sourceCard, sourceUid);
  if (effect.target !== "none") {
    if (!choices.length) { if (sourceZone === "monster") { if (afterAttack) resolveBattle(s, afterAttack); return; } fail("Não há alvo válido para este efeito."); }
    s.pending = { kind: "effect", actor: owner, sourceCard, sourceUid, sourceZone, choices, ...(afterAttack ? { afterAttack } : {}) }; return;
  }
  resolveEffect(s, owner, sourceCard, sourceUid, sourceZone);
}
function consumeEffectSource(s: DuelState, owner: PlayerId, card: CardData, sourceUid: string, sourceZone: "hand" | "spell" | "monster", choice?: EffectChoice) {
  const p = s.players[owner]; const effect = effectFor(card);
  if (sourceZone === "monster") return;
  if (sourceZone === "hand") {
    const index = p.hand.findIndex((h) => h.uid === sourceUid); if (index < 0) fail("Carta não está mais na mão.");
    p.hand.splice(index, 1);
    if (effect?.continuous) {
      if (card.id === 48179391) p.spells.forEach((x, i) => { if (x?.card.id === 48179391) destroySpell(s, owner, i); });
      const zone = p.spells.findIndex((x) => x === null); if (zone < 0) fail("Sem zona de magia livre.");
      p.spells[zone] = { uid: sourceUid, card, faceDown: false, ...(choice?.uid ? { targetUid: choice.uid, targetOwner: choice.owner } : {}), ...(card.id === 72302403 ? { expiresTurn: s.turn + 5 } : {}) };
    } else p.graveyard.push(card);
  } else {
    const index = p.spells.findIndex((x) => x?.uid === sourceUid); const spell = p.spells[index]; if (!spell) fail("Carta não está mais no campo.");
    if (effect?.continuous) { spell.faceDown = false; if (choice?.uid) { spell.targetUid = choice.uid; spell.targetOwner = choice.owner; } if (card.id === 72302403) spell.expiresTurn = s.turn + 5; }
    else destroySpell(s, owner, index);
  }
}
function resolveEffect(s: DuelState, owner: PlayerId, card: CardData, sourceUid: string, sourceZone: "hand" | "spell" | "monster", choice?: EffectChoice) {
  const e = effectFor(card); if (!e) fail("Efeito não implementado.");
  consumeEffectSource(s, owner, card, sourceUid, sourceZone, choice);
  const p = s.players[owner], enemy = other(owner);
  const index = choice?.uid ? s.players[choice.owner].monsters.findIndex((m) => m?.uid === choice.uid) : -1;
  switch (e.operation) {
    case "draw": drawCards(s, owner, e.amount ?? 0); break;
    case "damage": s.players[enemy].lp -= e.amount ?? 0; break;
    case "heal": p.lp += e.amount ?? 0; break;
    case "destroyEnemy": s.players[enemy].monsters.forEach((_, i) => destroyMonster(s, enemy, i)); break;
    case "destroyAll": for (const o of [0, 1] as const) s.players[o].monsters.forEach((_, i) => destroyMonster(s, o, i)); break;
    case "destroyAllSpells": for (const o of [0, 1] as const) s.players[o].spells.forEach((_, i) => destroySpell(s, o, i)); break;
    case "destroyEnemySpells": s.players[enemy].spells.forEach((_, i) => destroySpell(s, enemy, i)); break;
    case "destroySpell": if (choice) destroySpell(s, choice.owner, s.players[choice.owner].spells.findIndex((x) => x?.uid === choice.uid)); break;
    case "bug": if (choice && index >= 0) destroyMonster(s, choice.owner, index); break;
    case "boost": { const m = choice ? s.players[choice.owner].monsters[index] : null; if (m) m.boost = (m.boost ?? 0) + (e.amount ?? 0); break; }
    case "bounce": {
      const m = choice ? s.players[choice.owner].monsters[index] : null;
      if (choice && m) { s.players[choice.owner].hand.push({ uid: m.uid, card: m.card }); s.players[choice.owner].monsters[index] = null; }
      break;
    }
    case "revive": {
      if (!choice || choice.index === undefined) fail("Escolha um monstro no cemitério.");
      const target = s.players[choice.owner].graveyard[choice.index]; if (!target || target.kind !== "monster") fail("Alvo inválido.");
      const slot = p.monsters.findIndex((m) => m === null); if (slot < 0) fail("Sem zona de monstro livre.");
      s.players[choice.owner].graveyard.splice(choice.index, 1);
      p.monsters[slot] = { uid: uid(s), card: target, faceDown: false, position: "atk", attacked: false, summonedTurn: s.turn }; break;
    }
    case "faith": {
      if (choice?.index !== undefined) { const target = p.graveyard[choice.index]; if (target?.kind === "spell") { p.graveyard.splice(choice.index, 1); p.hand.push({ uid: uid(s), card: target }); } } break;
    }
    case "fissure": {
      const mons = s.players[enemy].monsters.map((m, i) => ({ m, i })).filter((x) => x.m && !x.m.faceDown).sort((a, b) => a.m && b.m ? monsterAtk(s, enemy, a.m) - monsterAtk(s, enemy, b.m) : 0);
      if (mons[0]) destroyMonster(s, enemy, mons[0].i); break;
    }
    case "swords": s.players[enemy].monsters.forEach((m) => { if (m) m.faceDown = false; }); break;
  }
  s.log.push(`${p.name} resolveu o efeito de ${card.name}.`); checkWin(s);
}
function resolveBattle(s: DuelState, attack: AttackContext) {
  if (s.winner !== null) return;
  const owner = attack.owner, enemy = other(owner); const me = s.players[owner], opp = s.players[enemy];
  const ai = me.monsters.findIndex((m) => m?.uid === attack.attackerUid), a = me.monsters[ai]; if (!a) return;
  if (!attack.targetUid) { s.lastBattle = { ...attack, sequence: (s.lastBattle?.sequence ?? 0) + 1 }; opp.lp -= monsterAtk(s, owner, a); s.log.push(`${a.card.name} atacou diretamente: ${monsterAtk(s, owner, a)} de dano.`); checkWin(s); return; }
  const ti = opp.monsters.findIndex((m) => m?.uid === attack.targetUid), t = opp.monsters[ti]; if (!t) return;
  if (t.faceDown) {
    t.faceDown = false;
    if (effectFor(t.card)?.timing === "flip") { startEffect(s, enemy, t.card, t.uid, "monster", attack); return; }
  }
  const A = monsterAtk(s, owner, a), D = t.position === "atk" ? monsterAtk(s, enemy, t) : monsterDef(s, enemy, t);
  s.lastBattle = { ...attack, sequence: (s.lastBattle?.sequence ?? 0) + 1 };
  if (t.position === "atk") {
    if (A > D) { opp.lp -= A - D; destroyMonster(s, enemy, ti); }
    else if (A < D) { me.lp -= D - A; destroyMonster(s, owner, ai); }
    else { destroyMonster(s, owner, ai); destroyMonster(s, enemy, ti); }
  } else { if (A > D) destroyMonster(s, enemy, ti); else if (A < D) me.lp -= D - A; }
  s.log.push(`${a.card.name} atacou ${t.card.name}.`); checkWin(s);
}
export function applyAction(state: DuelState, action: Action): DuelState {
  if (state.winner !== null) return state;
  const actor = action.actor ?? decisionPlayer(state);
  if (action.type !== "surrender" && actor !== decisionPlayer(state)) fail("Aguarde sua vez de agir.");
  const s = structuredClone(state), me = s.players[actor], enemy = other(actor);
  if (action.type === "surrender") { s.winner = enemy; s.pending = null; s.log.push(`${me.name} desistiu.`); return s; }
  if (s.pending) {
    const pending = s.pending;
    if (pending.kind === "effect") {
      if (action.type === "cancelEffect") {
        if (pending.sourceZone === "monster") fail("O efeito de virar deve ser resolvido.");
        s.pending = null; return s;
      }
      if (action.type !== "resolveEffect") fail("Escolha o alvo do efeito primeiro.");
      const fresh = effectChoices(s, actor, pending.sourceCard, pending.sourceUid);
      if (!pending.choices.some((c) => sameChoice(c, action.choice)) || !fresh.some((c) => sameChoice(c, action.choice))) fail("Alvo inválido para o efeito.");
      s.pending = null; resolveEffect(s, actor, pending.sourceCard, pending.sourceUid, pending.sourceZone, action.choice);
      if (pending.afterAttack && !s.pending) resolveBattle(s, pending.afterAttack); return s;
    }
    if (action.type === "passResponse") { s.pending = null; if (pending.attack) resolveBattle(s, pending.attack); return s; }
    if (action.type !== "activateField") fail("Ative uma armadilha ou deixe a ação continuar.");
    const spell = availableResponses(s).find((x) => x.uid === action.uid); if (!spell) fail("Esta armadilha não pode responder agora.");
    const effect = effectFor(spell.card); if (!effect) fail("Efeito não implementado.");
    s.pending = null; destroySpell(s, actor, me.spells.findIndex((x) => x?.uid === spell.uid));
    if (effect.operation === "mirror") s.players[enemy].monsters.forEach((m, i) => { if (m?.position === "atk") destroyMonster(s, enemy, i); });
    else if (effect.operation === "cylinder" && pending.attack) { const a = s.players[enemy].monsters.find((m) => m?.uid === pending.attack?.attackerUid); if (a) s.players[enemy].lp -= monsterAtk(s, enemy, a); }
    else if (effect.operation === "trapHole") { const i = s.players[enemy].monsters.findIndex((m) => m?.uid === pending.summonedUid); if (i >= 0) destroyMonster(s, enemy, i); }
    else if (effect.operation === "destroyAll") for (const o of [0, 1] as const) s.players[o].monsters.forEach((_, i) => destroyMonster(s, o, i));
    else if (effect.operation === "waboku") me.monsters.forEach((m) => { if (m && pending.attack?.targetUid === m.uid) m.faceDown = false; });
    else if (effect.operation === "negate") s.phase = "main2";
    s.log.push(`${me.name} ativou ${spell.card.name}.`); checkWin(s); return s;
  }
  switch (action.type) {
    case "draw": if (s.phase !== "draw") fail("Só é possível comprar na Fase de Compra."); drawCards(s, actor, 1); s.phase = "main1"; s.log.push(`${me.name} comprou uma carta.`); return s;
    case "nextPhase": {
      if (s.phase === "draw") fail("Compre uma carta primeiro.");
      if (s.phase === "main1") s.phase = s.turn === 1 ? "main2" : "battle";
      else if (s.phase === "battle") s.phase = "main2";
      else {
        while (me.hand.length > 6) { const card = me.hand.pop(); if (card) me.graveyard.push(card.card); }
        for (const owner of [0, 1] as const) { s.players[owner].monsters.forEach((m) => { if (m) m.boost = 0; }); s.players[owner].spells.forEach((spell, i) => { if (spell?.expiresTurn !== undefined && spell.expiresTurn <= s.turn) destroySpell(s, owner, i); }); }
        s.active = enemy; s.turn++; s.phase = "draw"; s.players[enemy].normalSummoned = false;
        s.players[enemy].monsters.forEach((m) => { if (m) m.attacked = false; }); s.log.push(`Turno ${s.turn}: ${s.players[enemy].name}.`);
      }
      return s;
    }
    case "summon": {
      if (!mainPhase(s)) fail("Invoque apenas nas Fases Principais."); if (me.normalSummoned) fail("Você já fez uma Invocação Normal neste turno.");
      const index = me.hand.findIndex((h) => h.uid === action.handUid), h = me.hand[index]; if (!h || h.card.kind !== "monster") fail("Carta inválida.");
      if (/Fusion|Ritual/.test(h.card.type ?? "")) fail("Monstros de Fusão/Ritual não podem ser Invocados normalmente.");
      const need = tributesNeeded(h.card.level), tr = action.tributes ?? [];
      if (tr.length !== need) fail(`Este monstro exige ${need} sacrifício(s).`);
      if (new Set(tr).size !== tr.length) fail("Cada sacrifício deve ser um monstro diferente.");
      const indices = tr.map((id) => me.monsters.findIndex((m) => m?.uid === id)); if (indices.some((i) => i < 0)) fail("Sacrifício inválido.");
      if (!need && !me.monsters.some((m) => m === null)) fail("Sem zona de monstro livre.");
      indices.forEach((i) => destroyMonster(s, actor, i));
      const zone = me.monsters.findIndex((m) => m === null); if (zone < 0) fail("Sem zona de monstro livre.");
      me.hand.splice(index, 1); me.monsters[zone] = { uid: h.uid, card: h.card, position: action.set ? "def" : "atk", faceDown: !!action.set, attacked: false, summonedTurn: s.turn };
      me.normalSummoned = true; s.log.push(action.set ? `${me.name} baixou um monstro.` : `${me.name} invocou ${h.card.name}.`);
      if (!action.set) {
        const slifer = s.players[enemy].monsters.some((m) => m?.card.id === 10000020 && !m.faceDown);
        if (slifer) { const m = me.monsters[zone]; if (m) { m.boost = -2000; if (monsterAtk(s, actor, m) <= 0) destroyMonster(s, actor, zone); } }
        responseWindow(s, "summon", actor, undefined, h.uid);
      }
      checkWin(s); return s;
    }
    case "setSpell": {
      if (!mainPhase(s)) fail("Baixe cartas apenas nas Fases Principais.");
      const hi = me.hand.findIndex((h) => h.uid === action.handUid), h = me.hand[hi]; if (!h || h.card.kind === "monster") fail("Carta inválida.");
      const zone = me.spells.findIndex((x) => x === null); if (zone < 0) fail("Sem zona de magia/armadilha livre.");
      me.hand.splice(hi, 1); me.spells[zone] = { uid: h.uid, card: h.card, faceDown: true, setTurn: s.turn }; s.log.push(`${me.name} baixou uma carta.`); return s;
    }
    case "activateSpell": {
      if (!mainPhase(s)) fail("Ative magias nas Fases Principais."); const h = me.hand.find((x) => x.uid === action.handUid);
      if (!h || h.card.kind !== "spell") fail("Armadilhas devem ser baixadas antes.");
      if (effectFor(h.card)?.timing !== "main") fail("O efeito desta carta ainda não foi implementado."); startEffect(s, actor, h.card, h.uid, "hand"); return s;
    }
    case "activateField": {
      if (!mainPhase(s)) fail("Ative esta magia nas Fases Principais."); const spell = me.spells.find((x) => x?.uid === action.uid);
      if (!spell || !spell.faceDown || spell.card.kind !== "spell") fail("Esta carta não pode ser ativada agora.");
      if (effectFor(spell.card)?.timing !== "main") fail("O efeito desta carta ainda não foi implementado."); startEffect(s, actor, spell.card, spell.uid, "spell"); return s;
    }
    case "changePosition": {
      if (!mainPhase(s)) fail("Mude posições nas Fases Principais."); const m = me.monsters.find((x) => x?.uid === action.uid); if (!m) fail("Monstro inválido.");
      if (m.summonedTurn === s.turn || m.attacked) fail("Este monstro já agiu ou foi colocado neste turno.");
      const flip = m.faceDown; m.position = m.position === "atk" ? "def" : "atk"; m.faceDown = false; m.summonedTurn = s.turn;
      if (flip && effectFor(m.card)?.timing === "flip") startEffect(s, actor, m.card, m.uid, "monster"); return s;
    }
    case "attack": {
      const a = me.monsters.find((x) => x?.uid === action.attackerUid); if (!a || !canAttack(s, a)) fail("Este monstro não pode atacar agora.");
      if (!action.targetUid && s.players[enemy].monsters.some(Boolean)) fail("O oponente tem monstros: escolha um alvo.");
      if (action.targetUid && !s.players[enemy].monsters.some((m) => m?.uid === action.targetUid)) fail("Alvo inválido.");
      a.attacked = true; responseWindow(s, "attack", actor, { owner: actor, attackerUid: a.uid, ...(action.targetUid ? { targetUid: action.targetUid } : {}) }); return s;
    }
    default: fail("Não há efeito ou resposta pendente.");
  }
}
/** Automatic decks only include normal monsters and explicitly supported effects. */
export function quickDeck(pool: CardData[], seed: number): CardData[] {
  const mons = shuffle(pool.filter((c) => c.kind === "monster" && !/Fusion|Ritual/.test(c.type ?? "") && hasPlayableEffect(c) && (c.atk ?? 0) > 0), seed);
  const low = mons.filter((c) => (c.level ?? 0) <= 4).slice(0, 26), high = mons.filter((c) => (c.level ?? 0) > 4).slice(0, 6);
  const st = shuffle(pool.filter((c) => c.kind !== "monster" && hasPlayableEffect(c)), seed + 1).slice(0, 8); return [...low, ...high, ...st];
}
