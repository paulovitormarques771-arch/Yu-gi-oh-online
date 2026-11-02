import { describe, expect, it } from "vitest";
import { deckFromIds, isPreparation, rareCard, readyPreparation, savedDeckCards } from "@/lib/duel-setup";
import { createDuel } from "@/lib/duel-engine";
import { ALL_CARDS } from "@/data/cards";

const ids = ALL_CARDS.slice(0, 10).map((card) => card.id);
describe("deck selection before a duel", () => {
  it("deals exactly the selected saved deck, with its copy counts", () => {
    const chosen = savedDeckCards({ id: "deck", name: "Meu deck", is_main: true, deck_cards: ids.slice(0, 4).map((card_id) => ({ card_id, copies: 2 })) });
    const state = createDuel(["Você", "IA"], [chosen, deckFromIds(ids)], 1);
    const actual = [...state.players[0].hand, ...state.players[0].deck].map((entry) => entry.card.id).sort();
    expect(actual).toEqual(ids.slice(0, 4).flatMap((id) => [id, id]).sort());
  });
  it("keeps each online player's selected deck while waiting for both", () => {
    const first = readyPreparation(null, 0, deckFromIds(ids));
    expect(first.decks[1]).toBeNull();
    const both = readyPreparation(first, 1, deckFromIds([...ids].reverse()));
    expect(both.decks).toEqual([ids, [...ids].reverse()]);
    expect(isPreparation(both)).toBe(true);
  });
  it("rejects decks over 45 cards", () => expect(() => deckFromIds(ALL_CARDS.slice(0, 46).map((card) => card.id))).toThrow("45"));
  it("rejects over 3 copies even when repeated in separate entries", () => expect(() => deckFromIds([ids[0] ?? 0, ids[0] ?? 0, ids[0] ?? 0, ids[0] ?? 0, ids[1] ?? 0])).toThrow("3 cópias"));
  it("identifies iconic rare cards without treating all monsters as rare", () => {
    const dragon = ALL_CARDS.find((card) => card.id === 89631139);
    if (!dragon) throw new Error("Missing Blue-Eyes");
    expect(rareCard(dragon)).toBe(true);
    expect(rareCard({ id: 1, name: "Normal", kind: "monster", desc: "", rarity: "comum" })).toBe(false);
  });
});