import { describe, expect, it } from "vitest";
import { applyAction, createDuel, START_LP, tributesNeeded, type DuelState } from "@/lib/duel-engine";
import type { CardData } from "@/data/catalog";

const mon = (id: number, a: number, d: number, level = 4): CardData => ({ id, name: `M${id}`, kind: "monster", atk: a, def: d, level, desc: "" });
const deck = (a: number) => Array.from({ length: 40 }, (_, i) => mon(i, a, 1000));

function setup(): DuelState { return createDuel(["A", "B"], [deck(1800), deck(1500)], 1); }

describe("duel engine", () => {
  it("starts with 8000 LP and 5 cards", () => {
    const s = setup();
    expect(s.players[0].lp).toBe(START_LP);
    expect(s.players[0].hand).toHaveLength(5);
  });
  it("5 estrelas exigem 1 sacrifício", () => expect(tributesNeeded(5)).toBe(1));
  it("6 estrelas exigem 2 sacrifícios", () => expect(tributesNeeded(6)).toBe(2));
  it("7 estrelas exigem 2 sacrifícios", () => expect(tributesNeeded(7)).toBe(2));
  it("8 estrelas ou mais exigem 3 sacrifícios", () => {
    expect(tributesNeeded(8)).toBe(3); expect(tributesNeeded(10)).toBe(3); expect(tributesNeeded(12)).toBe(3);
  });
  it("allows only one normal summon per turn", () => {
    let s = setup();
    s = applyAction(s, { type: "summon", handUid: s.players[0].hand[0]!.uid });
    expect(() => applyAction(s, { type: "summon", handUid: s.players[0].hand[0]!.uid })).toThrow();
  });
  it("first turn cannot attack; battle damage is ATK difference", () => {
    let s = setup();
    s = applyAction(s, { type: "summon", handUid: s.players[0].hand[0]!.uid });
    s = applyAction(s, { type: "nextPhase" });
    expect(s.phase).toBe("main2");
    s = applyAction(s, { type: "nextPhase" });
    s = applyAction(s, { type: "draw" });
    s = applyAction(s, { type: "summon", handUid: s.players[1].hand[0]!.uid });
    s = applyAction(s, { type: "nextPhase" });
    const b = s.players[1].monsters.find(Boolean)!; const a = s.players[0].monsters.find(Boolean)!;
    s = applyAction(s, { type: "attack", attackerUid: b.uid, targetUid: a.uid });
    expect(s.players[1].lp).toBe(START_LP - 300);
  });
  it("direct attack reducing LP to 0 wins", () => {
    let s = setup();
    s = applyAction(s, { type: "nextPhase" }); s = applyAction(s, { type: "nextPhase" });
    s = applyAction(s, { type: "draw" });
    s = applyAction(s, { type: "summon", handUid: s.players[1].hand[0]!.uid });
    s.players[0].lp = 1000;
    s = applyAction(s, { type: "nextPhase" });
    s = applyAction(s, { type: "attack", attackerUid: s.players[1].monsters.find(Boolean)!.uid });
    expect(s.winner).toBe(1);
  });
});
