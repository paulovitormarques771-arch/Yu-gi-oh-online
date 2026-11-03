// Deterministic simplified duel rules. Explicit effects only; no execution of card text.
import type { CardData } from "@/data/catalog";
import { effectFor, hasPlayableEffect } from "@/lib/duel-effects";
import { fieldIndestructible, isFieldSpell, terrainBonus } from "@/lib/field-spells";
import { fusionMaterials, type FusionMaterial } from "@/lib/fusion-recipes";

export const START_LP = 8000;
export const START_HAND = 5;
export const MONSTER_ZONES = 5;
export const SPELL_ZONES = 5;
export type Phase = "draw" | "main1" | "battle" | "main2" | "end";
export type PlayerId = 0 | 1;
export interface FieldMonster { uid: string; card: CardData; position: "atk" | "def"; faceDown: boolean; attacked: boolean; summonedTurn: number; boost?: number; returnOwner?: PlayerId; returnTurn?: number; effectUsedTurn?: number }
export interface FieldSpell { uid: string; card: CardData; faceDown: boolean; setTurn?: number; targetUid?: string; targetOwner?: PlayerId; expiresTurn?: number; activatedOrder?: number }
export interface PlayerState {
  name: string; lp: number; deck: { uid: string; card: CardData }[]; hand: { uid: string; card: CardData }[];
  monsters: (FieldMonster | null)[]; spells: (FieldSpell | null)[]; graveyard: CardData[]; normalSummoned: boolean;
  fieldSpell?: FieldSpell | null; extraDeck?: CardData[];
}
export type EffectChoice = { owner: PlayerId; zone: "monster" | "spell" | "graveyard" | "field" | "deck" | "extra" | "hand"; uid?: string; index?: number };
export type AttackContext = { owner: PlayerId; attackerUid: string; targetUid?: string };
export type PendingDecision =
  | { kind: "response"; actor: PlayerId; event: "attack" | "summon"; sourcePlayer: PlayerId; attack?: AttackContext; summonedUid?: string }
  | { kind: "effect"; actor: PlayerId; sourceUid: string; sourceCard: CardData; sourceZone: "hand" | "spell" | "monster" | "field"; choices: EffectChoice[]; afterAttack?: AttackContext; stage?: "cost"; costUid?: string };
export interface DuelState { players: [PlayerState, PlayerState]; turn: number; active: PlayerId; phase: Phase; winner: PlayerId | null; log: string[]; pending?: PendingDecision | null; nextUid?: number; lastBattle?: AttackContext & { sequence: number }; lastEffect?: { sequence: number; owner: PlayerId; card: CardData; choice?: EffectChoice }; lastDraw?: { sequence: number; owner: PlayerId; count: number } }
type Move =
  | { type: "draw" } | { type: "nextPhase" }
  | { type: "summon"; handUid: string; tributes?: string[]; set?: boolean }
  | { type: "setSpell"; handUid: string }
  | { type: "activateSpell"; handUid: string }
  | { type: "activateField"; uid: string }
  | { type: "activateMonster"; uid: string }
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
  const d = shuffle(deck.filter((c) => !/Fusion/.test(c.type ?? "")), seed).map((card, i) => ({ uid: `p${p}-${i}`, card }));
  return { name, lp: START_LP, deck: d.slice(START_HAND), hand: d.slice(0, START_HAND), monsters: Array(MONSTER_ZONES).fill(null), spells: Array(SPELL_ZONES).fill(null), fieldSpell: null, extraDeck: deck.filter((c) => /Fusion/.test(c.type ?? "")), graveyard: [], normalSummoned: false };
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
  let drawn = 0;
  for (let i = 0; i < count && s.winner === null; i++) {
    const h = s.players[owner].deck.shift();
    if (!h) { s.winner = other(owner); s.pending = null; s.log.push(`${s.players[owner].name} não tem cartas para comprar e perdeu.`); return; }
    s.players[owner].hand.push(h);
    drawn++;
  }
  if (drawn) s.lastDraw = { sequence: (s.lastDraw?.sequence ?? 0) + 1, owner, count: drawn };
  checkWin(s);
}
function destroyMonster(s: DuelState, owner: PlayerId, index: number) {
  const m = s.players[owner].monsters[index]; if (!m) return;
  s.players[m.returnOwner ?? owner].graveyard.push(m.card); s.players[owner].monsters[index] = null;
  for (const p of s.players) p.spells.forEach((spell, i) => {
    if (spell?.targetUid === m.uid) { p.graveyard.push(spell.card); p.spells[i] = null; }
  });
}
function destroyField(s: DuelState, owner: PlayerId, replacement = false) {
  const field = s.players[owner].fieldSpell;
  if (!field || !replacement && fieldIndestructible(field.card)) return;
  s.players[owner].graveyard.push(field.card); s.players[owner].fieldSpell = null;
}
function destroySpell(s: DuelState, owner: PlayerId, index: number) {
  const spell = s.players[owner].spells[index]; if (!spell) return;
  if (fieldIndestructible(spell.card)) return;
  s.players[owner].graveyard.push(spell.card); s.players[owner].spells[index] = null;
}
export function monsterAtk(s: DuelState, owner: PlayerId, m: FieldMonster) {
  let value = m.card.id === 10000020 ? s.players[owner].hand.length * 1000 : m.card.atk ?? 0;
  if (m.card.id === 38033121) value += s.players.flatMap((p) => p.graveyard).filter((c) => c.id === 46986414 || c.id === 40737112).length * 300;
  value += m.boost ?? 0;
  if (m.card.id === 78193831 || m.card.id === 78193832) value += 500 * [...s.players[other(owner)].graveyard, ...s.players[other(owner)].monsters.flatMap((x) => x && !x.faceDown ? [x.card] : [])].filter((c) => c.race === "Dragon").length;
  for (const fieldOwner of [0, 1] as const) {
    const field = s.players[fieldOwner].fieldSpell;
    if (!field || field.faceDown) continue;
    value += terrainBonus(field.card, m.card);
    if (field.card.id === 48179391 && fieldOwner === owner) value += 500;
  }
  for (const p of s.players) for (const spell of p.spells) {
    if (!spell || spell.faceDown) continue;
    if (spell.card.id === 40619825 && spell.targetUid === m.uid) value += 1000;
    if (spell.card.id === 48179391 && p === s.players[owner]) value += 500;
  }
  return Math.max(0, value);
}
export function monsterDef(s: DuelState, owner: PlayerId, m: FieldMonster) {
  let value = m.card.id === 10000020 ? s.players[owner].hand.length * 1000 : m.card.def ?? 0;
  for (const p of s.players) if (p.fieldSpell && !p.fieldSpell.faceDown) value += terrainBonus(p.fieldSpell.card, m.card);
  return Math.max(0, value);
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
    if (target === "spellTrap" && (card.id !== 60082869 || p !== owner)) {
      s.players[p].spells.forEach((spell) => { if (spell && spell.uid !== sourceUid) list.push({ owner: p, zone: "spell", uid: spell.uid }); });
      const field = s.players[p].fieldSpell;
      if (field && field.uid !== sourceUid) list.push({ owner: p, zone: "field", uid: field.uid });
    }
  }
  if (target === "fieldDeck") s.players[owner].deck.forEach((h) => { if (isFieldSpell(h.card)) list.push({ owner, zone: "deck", uid: h.uid }); });
  if (target === "fusion") {
    (s.players[owner].extraDeck ?? []).forEach((c, index) => {
      const materials = fusionMaterials(c, fusionPool(s, owner, card.id === 48130397));
      if (materials && (s.players[owner].monsters.some((m) => !m) || materials.some((m) => m.owner === owner && m.zone === "monster"))) list.push({ owner, zone: "extra", index });
    });
  }
  return list;
}
function fusionPool(s: DuelState, owner: PlayerId, superFusion: boolean): FusionMaterial[] {
  const result: FusionMaterial[] = [];
  if (!superFusion) result.push(...s.players[owner].hand.filter((h) => h.card.kind === "monster").map((h) => ({ ...h, owner, zone: "hand" as const })));
  for (const o of [0, 1] as const) if (o === owner || superFusion) s.players[o].monsters.forEach((m) => { if (m && (!superFusion || !m.faceDown)) result.push({ uid: m.uid, card: m.card, owner: o, zone: "monster" }); });
  return result;
}
export function choiceCard(s: DuelState, choice: EffectChoice): CardData | null {
  const p = s.players[choice.owner];
  if (choice.zone === "graveyard") return choice.index === undefined ? null : p.graveyard[choice.index] ?? null;
  if (choice.zone === "extra") return choice.index === undefined ? null : p.extraDeck?.[choice.index] ?? null;
  if (choice.zone === "field") { const field = p.fieldSpell; return field && field.uid === choice.uid ? field.card : null; }
  if (choice.zone === "deck" || choice.zone === "hand") return p[choice.zone].find((h) => h.uid === choice.uid)?.card ?? null;
  const zones = choice.zone === "monster" ? p.monsters : p.spells;
  return zones.find((c) => c?.uid === choice.uid)?.card ?? null;
}
function sameChoice(a: EffectChoice, b: EffectChoice) { return a.owner === b.owner && a.zone === b.zone && a.uid === b.uid && a.index === b.index; }
export function availableResponses(s: DuelState): FieldSpell[] {
  const pending = s.pending; if (!pending || pending.kind !== "response") return [];
  if (s.players.some((p) => p.monsters.some((m) => m && !m.faceDown && (m.card.id === 77585513 || m.card.id === 35803249)))) return [];
  return s.players[pending.actor].spells.filter((spell): spell is FieldSpell => {
    if (!spell || !spell.faceDown || spell.setTurn === undefined || spell.setTurn >= s.turn) return false;
    const effect = effectFor(spell.card); if (effect?.timing !== pending.event) return false;
    if (effect.operation === "destroySpell" && !effectChoices(s, pending.actor, spell.card, spell.uid).length) return false;
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
function startEffect(s: DuelState, owner: PlayerId, sourceCard: CardData, sourceUid: string, sourceZone: "hand" | "spell" | "monster" | "field", afterAttack?: AttackContext) {
  const effect = effectFor(sourceCard); if (!effect) fail("O efeito desta carta ainda não foi implementado.");
  if (sourceCard.id === 83764718 && !s.players[owner].monsters.some((m) => m === null)) fail("Sem zona de monstro livre.");
  if (effect.continuous && !isFieldSpell(sourceCard) && sourceZone === "hand" && !s.players[owner].spells.some((m) => m === null)) fail("Sem zona de magia livre.");
  if (effect.operation === "control" && !s.players[owner].monsters.some((m) => !m)) fail("Sem zona de monstro livre.");
  if (effect.operation === "toon" && s.players[owner].lp <= 1000) fail("São necessários mais de 1000 LP.");
  if (effect.discard) {
    const choices: EffectChoice[] = s.players[owner].hand.filter((h) => h.uid !== sourceUid).map((h) => ({ owner, zone: "hand", uid: h.uid }));
    if (!choices.length) fail("Descarte 1 outra carta para ativar.");
    if (effect.target !== "none" && !effectChoices(s, owner, sourceCard, sourceUid).length) fail("Não há alvo válido para este efeito.");
    s.pending = { kind: "effect", actor: owner, sourceCard, sourceUid, sourceZone, choices, stage: "cost" }; return;
  }
  const choices = effectChoices(s, owner, sourceCard, sourceUid);
  if (effect.target !== "none") {
    if (!choices.length) { if (sourceZone === "monster") { if (afterAttack) resolveBattle(s, afterAttack); return; } fail("Não há alvo válido para este efeito."); }
    s.pending = { kind: "effect", actor: owner, sourceCard, sourceUid, sourceZone, choices, ...(afterAttack ? { afterAttack } : {}) }; return;
  }
  resolveEffect(s, owner, sourceCard, sourceUid, sourceZone);
}
function consumeEffectSource(s: DuelState, owner: PlayerId, card: CardData, sourceUid: string, sourceZone: "hand" | "spell" | "monster" | "field", choice?: EffectChoice) {
  const p = s.players[owner]; const effect = effectFor(card);
  if (sourceZone === "monster") return;
  if (isFieldSpell(card)) {
    if (sourceZone === "hand") { const index = p.hand.findIndex((h) => h.uid === sourceUid); if (index < 0) fail("Carta não está mais na mão."); p.hand.splice(index, 1); }
    else if (sourceZone === "spell") { const index = p.spells.findIndex((h) => h?.uid === sourceUid); if (index < 0) fail("Carta não está mais no campo."); p.spells[index] = null; }
    if (p.fieldSpell?.uid !== sourceUid) destroyField(s, owner, true);
    p.fieldSpell = { uid: sourceUid, card, faceDown: false, activatedOrder: (s.lastEffect?.sequence ?? 0) + 1 }; return;
  }
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
function resolveEffect(s: DuelState, owner: PlayerId, card: CardData, sourceUid: string, sourceZone: "hand" | "spell" | "monster" | "field", choice?: EffectChoice, costUid?: string) {
  const e = effectFor(card); if (!e) fail("Efeito não implementado.");
  if (e.discard) { const index = s.players[owner].hand.findIndex((h) => h.uid === costUid); const cost = s.players[owner].hand[index]; if (!cost || cost.uid === sourceUid) fail("Custo inválido."); s.players[owner].hand.splice(index, 1); s.players[owner].graveyard.push(cost.card); }
  const fusion = e.target === "fusion" && choice ? choiceCard(s, choice) : null;
  const materials = fusion ? fusionMaterials(fusion, fusionPool(s, owner, card.id === 48130397)) : null;
  if (e.target === "fusion" && (!fusion || !materials)) fail("Materiais de fusão inválidos.");
  consumeEffectSource(s, owner, card, sourceUid, sourceZone, choice);
  s.lastEffect = { sequence: (s.lastEffect?.sequence ?? 0) + 1, owner, card, ...(choice ? { choice } : {}) };
  const p = s.players[owner], enemy = other(owner);
  const index = choice?.uid ? s.players[choice.owner].monsters.findIndex((m) => m?.uid === choice.uid) : -1;
  switch (e.operation) {
    case "draw": drawCards(s, owner, e.amount ?? 0); break;
    case "damage": s.players[enemy].lp -= e.amount ?? 0; break;
    case "heal": p.lp += e.amount ?? 0; break;
    case "destroyEnemy": s.players[enemy].monsters.forEach((_, i) => destroyMonster(s, enemy, i)); break;
    case "destroyAll": for (const o of [0, 1] as const) s.players[o].monsters.forEach((_, i) => destroyMonster(s, o, i)); break;
    case "destroyAllSpells": for (const o of [0, 1] as const) { s.players[o].spells.forEach((_, i) => destroySpell(s, o, i)); destroyField(s, o); } break;
    case "destroyEnemySpells": s.players[enemy].spells.forEach((_, i) => destroySpell(s, enemy, i)); destroyField(s, enemy); break;
    case "destroySpell": if (choice) { if (choice.zone === "field") destroyField(s, choice.owner); else destroySpell(s, choice.owner, s.players[choice.owner].spells.findIndex((x) => x?.uid === choice.uid)); } break;
    case "destroyFaceUp": s.players[enemy].monsters.forEach((m, i) => { if (m && !m.faceDown) destroyMonster(s, enemy, i); }); break;
    case "toon": p.lp -= 1000; break;
    case "control": {
      const m = s.players[enemy].monsters[index]; const slot = p.monsters.findIndex((m) => !m);
      if (m && slot >= 0) { s.players[enemy].monsters[index] = null; m.returnOwner = m.returnOwner ?? enemy; m.returnTurn = s.turn; p.monsters[slot] = m; } break;
    }
    case "terraform": {
      const index = p.deck.findIndex((h) => h.uid === choice?.uid); const h = p.deck[index];
      if (h) { p.deck.splice(index, 1); p.hand.push(h); p.deck = shuffle(p.deck, s.turn + (s.nextUid ?? 1)); } break;
    }
    case "fusion": case "superFusion": {
      if (!fusion || !materials || choice?.index === undefined) fail("Fusão inválida.");
      for (const material of materials) {
        if (material.zone === "monster") destroyMonster(s, material.owner, s.players[material.owner].monsters.findIndex((m) => m?.uid === material.uid));
        else { const index = p.hand.findIndex((h) => h.uid === material.uid); const h = p.hand[index]; if (h) { p.hand.splice(index, 1); p.graveyard.push(h.card); } }
      }
      const slot = p.monsters.findIndex((m) => !m); if (slot < 0) fail("Sem zona de monstro livre.");
      p.extraDeck?.splice(choice.index, 1); p.monsters[slot] = { uid: uid(s), card: fusion, faceDown: false, position: "atk", attacked: false, summonedTurn: s.turn }; break;
    }
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
        s.pending = null; if (pending.afterAttack) resolveBattle(s, pending.afterAttack); return s;
      }
      if (action.type !== "resolveEffect") fail("Escolha o alvo do efeito primeiro.");
      if (pending.stage === "cost") {
        const cost = me.hand.find((h) => h.uid === action.choice.uid && h.uid !== pending.sourceUid);
        if (action.choice.zone !== "hand" || action.choice.owner !== actor || !cost) fail("Escolha outra carta da mão para descartar.");
        const choices = effectChoices(s, actor, pending.sourceCard, pending.sourceUid);
        if (effectFor(pending.sourceCard)?.target !== "none") { const { stage: _stage, ...rest } = pending; s.pending = { ...rest, costUid: cost.uid, choices }; return s; }
        s.pending = null; resolveEffect(s, actor, pending.sourceCard, pending.sourceUid, pending.sourceZone, undefined, cost.uid); return s;
      }
      const fresh = effectChoices(s, actor, pending.sourceCard, pending.sourceUid);
      if (!pending.choices.some((c) => sameChoice(c, action.choice)) || !fresh.some((c) => sameChoice(c, action.choice))) fail("Alvo inválido para o efeito.");
      s.pending = null; resolveEffect(s, actor, pending.sourceCard, pending.sourceUid, pending.sourceZone, action.choice, pending.costUid);
      if (pending.afterAttack && !s.pending) resolveBattle(s, pending.afterAttack); return s;
    }
    if (action.type === "passResponse") { s.pending = null; if (pending.attack) resolveBattle(s, pending.attack); return s; }
    if (action.type !== "activateField") fail("Ative uma armadilha ou deixe a ação continuar.");
    const spell = availableResponses(s).find((x) => x.uid === action.uid); if (!spell) fail("Esta armadilha não pode responder agora.");
    const effect = effectFor(spell.card); if (!effect) fail("Efeito não implementado.");
    if (effect.target !== "none") { s.pending = null; startEffect(s, actor, spell.card, spell.uid, "spell", pending.attack); return s; }
    s.pending = null; destroySpell(s, actor, me.spells.findIndex((x) => x?.uid === spell.uid));
    s.lastEffect = { sequence: (s.lastEffect?.sequence ?? 0) + 1, owner: actor, card: spell.card };
    if (effect.operation === "mirror") s.players[enemy].monsters.forEach((m, i) => { if (m?.position === "atk") destroyMonster(s, enemy, i); });
    else if (effect.operation === "cylinder" && pending.attack) { const a = s.players[enemy].monsters.find((m) => m?.uid === pending.attack?.attackerUid); if (a) s.players[enemy].lp -= monsterAtk(s, enemy, a); }
    else if (effect.operation === "trapHole") { const i = s.players[enemy].monsters.findIndex((m) => m?.uid === pending.summonedUid); if (i >= 0) destroyMonster(s, enemy, i); }
    else if (effect.operation === "destroyAll") for (const o of [0, 1] as const) s.players[o].monsters.forEach((_, i) => destroyMonster(s, o, i));
    else if (effect.operation === "waboku") me.monsters.forEach((m) => { if (m && pending.attack?.targetUid === m.uid) m.faceDown = false; });
    else if (effect.operation === "negate") s.phase = "main2";
    else if (effect.operation === "sakuretsu" && pending.attack) { const index = s.players[enemy].monsters.findIndex((m) => m?.uid === pending.attack?.attackerUid); if (index >= 0) destroyMonster(s, enemy, index); }
    else if (effect.operation === "javelin" && pending.attack) { const a = s.players[enemy].monsters.find((m) => m?.uid === pending.attack?.attackerUid); if (a) me.lp += monsterAtk(s, enemy, a); resolveBattle(s, pending.attack); }
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
        for (const owner of [0, 1] as const) s.players[owner].monsters.forEach((m, index) => {
          if (!m || m.returnOwner === undefined || m.returnTurn !== s.turn) return;
          const home = s.players[m.returnOwner], slot = home.monsters.findIndex((x) => !x);
          if (slot < 0) destroyMonster(s, owner, index);
          else { s.players[owner].monsters[index] = null; delete m.returnOwner; delete m.returnTurn; home.monsters[slot] = m; }
        });
        s.active = enemy; s.turn++; s.phase = "draw"; s.players[enemy].normalSummoned = false;
        s.players[enemy].monsters.forEach((m) => { if (m) m.attacked = false; }); s.log.push(`Turno ${s.turn}: ${s.players[enemy].name}.`);
      }
      return s;
    }
    case "summon": {
      if (!mainPhase(s)) fail("Invoque apenas nas Fases Principais.");
      const index = me.hand.findIndex((h) => h.uid === action.handUid), h = me.hand[index]; if (!h || h.card.kind !== "monster") fail("Carta inválida.");
      const specialJinzo = h.card.id === 35803249;
      if (!specialJinzo && me.normalSummoned) fail("Você já fez uma Invocação Normal neste turno.");
      if (specialJinzo && action.set) fail("Jinzo - Lord não pode ser baixado.");
      if (/Fusion|Ritual/.test(h.card.type ?? "")) fail("Monstros de Fusão/Ritual não podem ser Invocados normalmente.");
      const need = specialJinzo ? 1 : tributesNeeded(h.card.level), tr = action.tributes ?? [];
      if (tr.length !== need) fail(`Este monstro exige ${need} sacrifício(s).`);
      if (new Set(tr).size !== tr.length) fail("Cada sacrifício deve ser um monstro diferente.");
      const indices = tr.map((id) => me.monsters.findIndex((m) => m?.uid === id)); if (indices.some((i) => i < 0)) fail("Sacrifício inválido.");
      if (specialJinzo && !indices.every((i) => me.monsters[i]?.card.id === 77585513 && !me.monsters[i]?.faceDown)) fail("Envie 1 Jinzo com a face para cima ao Cemitério.");
      if (!need && !me.monsters.some((m) => m === null)) fail("Sem zona de monstro livre.");
      indices.forEach((i) => destroyMonster(s, actor, i));
      const zone = me.monsters.findIndex((m) => m === null); if (zone < 0) fail("Sem zona de monstro livre.");
      me.hand.splice(index, 1); me.monsters[zone] = { uid: h.uid, card: h.card, position: action.set ? "def" : "atk", faceDown: !!action.set, attacked: false, summonedTurn: s.turn };
      if (!specialJinzo) me.normalSummoned = true; s.log.push(action.set ? `${me.name} baixou um monstro.` : `${me.name} invocou ${h.card.name}.`);
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
      if (isFieldSpell(h.card)) { destroyField(s, actor, true); me.hand.splice(hi, 1); me.fieldSpell = { uid: h.uid, card: h.card, faceDown: true, setTurn: s.turn }; s.log.push(`${me.name} baixou uma carta de campo.`); return s; }
      const zone = me.spells.findIndex((x) => x === null); if (zone < 0) fail("Sem zona de magia/armadilha livre.");
      me.hand.splice(hi, 1); me.spells[zone] = { uid: h.uid, card: h.card, faceDown: true, setTurn: s.turn }; s.log.push(`${me.name} baixou uma carta.`); return s;
    }
    case "activateSpell": {
      if (!mainPhase(s)) fail("Ative magias nas Fases Principais."); const h = me.hand.find((x) => x.uid === action.handUid);
      if (!h || h.card.kind !== "spell") fail("Armadilhas devem ser baixadas antes.");
      if (effectFor(h.card)?.timing !== "main") fail("O efeito desta carta ainda não foi implementado."); startEffect(s, actor, h.card, h.uid, "hand"); return s;
    }
    case "activateField": {
      if (!mainPhase(s)) fail("Ative esta magia nas Fases Principais."); const spell = me.fieldSpell?.uid === action.uid ? me.fieldSpell : me.spells.find((x) => x?.uid === action.uid);
      if (!spell || !spell.faceDown || spell.card.kind !== "spell") fail("Esta carta não pode ser ativada agora.");
      if (effectFor(spell.card)?.timing !== "main") fail("O efeito desta carta ainda não foi implementado."); startEffect(s, actor, spell.card, spell.uid, me.fieldSpell?.uid === spell.uid ? "field" : "spell"); return s;
    }
    case "activateMonster": {
      const m = me.monsters.find((m) => m?.uid === action.uid);
      if (!mainPhase(s) || !m || m.faceDown || m.card.id !== 35803249 || m.effectUsedTurn === s.turn) fail("Efeito de monstro indisponível.");
      let destroyed = 0;
      for (const owner of [0, 1] as const) s.players[owner].spells.forEach((spell, i) => { if (spell && !spell.faceDown && spell.card.kind === "trap") { destroySpell(s, owner, i); destroyed++; } });
      m.effectUsedTurn = s.turn; s.players[enemy].lp -= destroyed * 300;
      s.lastEffect = { sequence: (s.lastEffect?.sequence ?? 0) + 1, owner: actor, card: m.card };
      s.log.push(`${me.name} ativou ${m.card.name}: ${destroyed * 300} de dano.`); checkWin(s); return s;
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
