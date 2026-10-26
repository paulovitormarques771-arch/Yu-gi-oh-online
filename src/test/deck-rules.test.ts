import { describe, expect, it } from "vitest";
import {
  addCard,
  canAddCard,
  copiesOf,
  MAX_COPIES,
  MAX_DECK_SIZE,
  removeCard,
  totalCards,
  type DeckEntry,
} from "@/lib/deck-rules";

describe("deck rules", () => {
  it("allows at most 3 copies of the same card", () => {
    let entries: DeckEntry[] = [];
    entries = addCard(entries, 1);
    entries = addCard(entries, 1);
    entries = addCard(entries, 1);
    expect(copiesOf(entries, 1)).toBe(MAX_COPIES);
    const check = canAddCard(entries, 1);
    expect(check.ok).toBe(false);
    expect(addCard(entries, 1)).toEqual(entries);
  });

  it("allows at most 45 cards in the deck", () => {
    let entries: DeckEntry[] = [];
    for (let cardId = 1; cardId <= 15; cardId++) {
      entries = addCard(entries, cardId);
      entries = addCard(entries, cardId);
      entries = addCard(entries, cardId);
    }
    expect(totalCards(entries)).toBe(MAX_DECK_SIZE);
    expect(canAddCard(entries, 999).ok).toBe(false);
    expect(addCard(entries, 999)).toEqual(entries);
  });

  it("removes copies and drops the entry at zero", () => {
    let entries: DeckEntry[] = [{ cardId: 7, copies: 2 }];
    entries = removeCard(entries, 7);
    expect(copiesOf(entries, 7)).toBe(1);
    entries = removeCard(entries, 7);
    expect(copiesOf(entries, 7)).toBe(0);
    expect(entries).toHaveLength(0);
  });
});
