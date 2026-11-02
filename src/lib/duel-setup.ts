import { CARDS, type CardData } from "@/data/catalog";
import { CARDS_BY_ID } from "@/data/cards";
import { MAX_COPIES, MAX_DECK_SIZE } from "@/lib/deck-rules";
import type { DuelState } from "@/lib/duel-engine";

export interface SavedDuelDeck { id: string; name: string; is_main: boolean; deck_cards: { card_id: number; copies: number }[] }
export type RoomPreparation = { kind: "setup"; decks: [number[] | null, number[] | null] };
export type RoomState = DuelState | RoomPreparation;
export const isPreparation = (state: RoomState | null): state is RoomPreparation => !!state && "kind" in state && state.kind === "setup";

export function deckFromIds(ids: number[]): CardData[] {
  if (!ids.length) throw new Error("Escolha um deck com pelo menos 1 carta.");
  if (ids.length > MAX_DECK_SIZE) throw new Error("O deck ultrapassa 45 cartas.");
  const counts = new Map<number, number>();
  return ids.map((id) => {
    const card = CARDS_BY_ID.get(id);
    if (!card) throw new Error("O deck contém uma carta fora do catálogo.");
    const copies = (counts.get(id) ?? 0) + 1;
    if (copies > MAX_COPIES) throw new Error("O deck ultrapassa 3 cópias da mesma carta.");
    counts.set(id, copies);
    return card;
  });
}

export function savedDeckCards(deck: SavedDuelDeck) {
  const ids = deck.deck_cards.flatMap((entry) => {
    if (!Number.isInteger(entry.copies) || entry.copies < 1 || entry.copies > MAX_COPIES) throw new Error("Quantidade de cópias inválida.");
    return Array<number>(entry.copies).fill(entry.card_id);
  });
  return deckFromIds(ids);
}

/** Existing iconic catalog is the rarity authority; arbitrary levels do not imply rarity. */
export function rareCard(card: CardData) {
  const rarity = card.rarity ?? CARDS.find((entry) => entry.id === card.id)?.rarity;
  return !!rarity && rarity !== "comum";
}

export function readyPreparation(state: RoomState | null, seat: 0 | 1, cards: CardData[]): RoomPreparation {
  const ids = cards.map((card) => card.id);
  deckFromIds(ids);
  const decks: RoomPreparation["decks"] = isPreparation(state) ? [...state.decks] : [null, null];
  decks[seat] = ids;
  return { kind: "setup", decks };
}