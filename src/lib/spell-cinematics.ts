import type { DuelState, PlayerId } from "@/lib/duel-engine";
import type { CardData } from "@/data/catalog";
export type CinematicKind = "reborn" | "blackhole" | "lightning" | "draw" | "mirror" | "cylinder" | "tornado" | "negate" | "armor" | "storm" | "javelin" | "swords" | "control" | "search" | "fusion";
export const SPELL_CINEMATICS: Record<number, CinematicKind> = {
  83764718: "reborn", 53129443: "blackhole", 12580477: "lightning", 55144522: "draw", 44095762: "mirror", 62279055: "cylinder",
  60082869: "tornado", 14315573: "negate", 56120475: "armor", 19613556: "storm", 96355986: "javelin", 72302403: "swords",
  4031928: "control", 69162969: "lightning", 73628505: "search", 24094653: "fusion", 48130397: "fusion",
  35803249: "lightning",
};
export type SpellEvent = { id: number; owner: PlayerId; card: CardData; kind: CinematicKind; targetIndex?: number; targetOwner?: PlayerId };
export type DrawEvent = { id: number; owner: PlayerId; cards: CardData[] };
export function spellEvent(before: DuelState, after: DuelState, id: number): SpellEvent | null {
  const effect = after.lastEffect;
  if (!effect || effect.sequence === before.lastEffect?.sequence || after.turn < before.turn) return null;
  const kind = SPELL_CINEMATICS[effect.card.id]; if (!kind) return null;
  const choice = effect.choice;
  const index = choice?.uid ? before.players[choice.owner].monsters.findIndex((m) => m?.uid === choice.uid) : kind === "reborn" ? after.players[effect.owner].monsters.findIndex((m) => m && !before.players[effect.owner].monsters.some((old) => old?.uid === m.uid)) : -1;
  const targetOwner = kind === "reborn" ? effect.owner : choice?.owner;
  return { id, owner: effect.owner, card: effect.card, kind, ...(index >= 0 && targetOwner !== undefined ? { targetIndex: index, targetOwner } : {}) };
}
export function drawEvent(before: DuelState, after: DuelState, id: number): DrawEvent | null {
  const draw = after.lastDraw;
  if (!draw || draw.sequence === before.lastDraw?.sequence || after.turn < before.turn) return null;
  const old = new Set(before.players[draw.owner].hand.map((h) => h.uid));
  const cards = after.players[draw.owner].hand.filter((h) => !old.has(h.uid)).map((h) => h.card);
  return cards.length ? { id, owner: draw.owner, cards } : null;
}