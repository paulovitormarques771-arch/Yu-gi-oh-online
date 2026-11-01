import { describe, expect, it } from "vitest";
import { ALL_CARDS } from "@/data/cards";
import { createDuel, type Action } from "@/lib/duel-engine";
import { emptyPlaystyle, observePlaystyle, trainingDeck, readPlaystyle } from "@/lib/duel-training";

describe("training difficulty and adaptive habits", () => {
  it("offers a legal 40-card hard deck with magic and traps and no more than three copies", () => {
    const deck = trainingDeck(ALL_CARDS, 42, "hard");
    expect(deck).toHaveLength(40);
    expect(deck.some((c) => c.id === 44095762)).toBe(true);
    expect(deck.some((c) => c.id === 12580477)).toBe(true);
    expect(Math.max(...deck.map((c) => deck.filter((n) => n.id === c.id).length))).toBeLessThanOrEqual(3);
  });
  it("records attacks and direct attacks for later adaptation, without storing cards", () => {
    const s = createDuel(["A", "B"], [trainingDeck(ALL_CARDS, 4, "normal"), trainingDeck(ALL_CARDS, 5, "normal")], 1);
    const action: Action = { type: "attack", attackerUid: "a" };
    const profile = observePlaystyle(emptyPlaystyle(), s, action);
    expect(profile.attacks).toBe(1);
    expect(profile.directAttacks).toBe(1);
    expect(Object.keys(profile)).not.toContain("cards");
  });
  it("records revealed trap activations and tribute habits", () => {
    const s = createDuel(["A", "B"], [[], []], 1);
    s.pending = { kind: "response", actor: 0, sourcePlayer: 1, event: "attack" };
    const p = observePlaystyle(emptyPlaystyle(), s, { type: "activateField", uid: "trap" });
    expect(p.traps).toBe(1);
    expect(observePlaystyle(p, s, { type: "summon", handUid: "high", tributes: ["a", "b", "c"] }).tributes).toBe(3);
    expect(readPlaystyle(JSON.stringify(p)).traps).toBe(1);
  });
  it("safely ignores corrupted profile storage", () => expect(readPlaystyle("invalid")).toEqual(emptyPlaystyle()));
});