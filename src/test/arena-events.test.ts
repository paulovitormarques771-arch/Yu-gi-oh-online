import { describe, expect, it } from "vitest";
import { applyAction, createDuel, type FieldMonster } from "@/lib/duel-engine";
import { combatEvent, rareSummonEvent } from "@/lib/arena-events";
import type { CardData } from "@/data/catalog";

const card: CardData = { id: 1, name: "M", kind: "monster", level: 4, atk: 1000, def: 500, desc: "" };
const monster: FieldMonster = { uid: "a", card, position: "atk", faceDown: false, attacked: false, summonedTurn: 0 };
describe("actual combat presentation values", () => {
  it("emits rare summon rays only for visible rare monsters", () => {
    const before = createDuel(["A", "B"], [Array(10).fill(card), Array(10).fill(card)], 1);
    const after = structuredClone(before);
    after.players[0].monsters[0] = { ...monster, card: { ...card, rarity: "ultra" } };
    expect(rareSummonEvent(before, after, 7)?.monsters.map((entry) => entry.uid)).toEqual(["a"]);
    const rare = after.players[0].monsters[0];
    if (!rare) throw new Error("Missing rare");
    rare.faceDown = true;
    expect(rareSummonEvent(before, after, 8)).toBeNull();
  });
  it("distinguishes resolved sword attacks from spell-only LP damage", () => {
    const before = createDuel(["A", "B"], [Array(10).fill(card), Array(10).fill(card)], 1);
    before.turn = 2; before.phase = "battle"; before.players[0].monsters[0] = monster;
    const attack = applyAction(before, { type: "attack", attackerUid: "a" });
    expect(combatEvent(before, attack, 1)?.battleResolved).toBe(true);
    const spellDamage = structuredClone(before); spellDamage.players[1].lp -= 1000;
    expect(combatEvent(before, spellDamage, 2)?.battleResolved).toBe(false);
  });
  it("reports exactly -1000 when an opponent loses 1000 LP", () => {
    const s = createDuel(["A", "B"], [Array(10).fill(card), Array(10).fill(card)], 1);
    s.turn = 2; s.phase = "battle"; s.players[0].monsters[0] = monster;
    const next = applyAction(s, { type: "attack", attackerUid: "a" });
    expect(combatEvent(s, next, 1)?.damages).toEqual([{ owner: 1, amount: 1000 }]);
    expect(next.players[1].lp).toBe(7000);
  });
  it("does not announce damage while a defender can respond", () => {
    const s = createDuel(["A", "B"], [Array(10).fill(card), Array(10).fill(card)], 1);
    const next = structuredClone(s);
    next.pending = { kind: "response", actor: 1, sourcePlayer: 0, event: "attack", attack: { owner: 0, attackerUid: "a" } };
    expect(combatEvent(s, next, 1)).toBeNull();
  });
  it("never sends a removed face-down monster identity to the animation", () => {
    const s = createDuel(["A", "B"], [Array(10).fill(card), Array(10).fill(card)], 1);
    s.players[1].monsters[0] = { ...monster, faceDown: true };
    const next = structuredClone(s); next.players[1].monsters[0] = null;
    expect(combatEvent(s, next, 1)).toBeNull();
  });
  it("identifies the actual hit monster even when it survives with no LP damage", () => {
    const s = createDuel(["A", "B"], [Array(10).fill(card), Array(10).fill(card)], 1);
    s.turn = 2; s.phase = "battle"; s.players[0].monsters[0] = monster;
    s.players[1].monsters[0] = { ...monster, uid: "defender", position: "def", card: { ...card, def: 1000 } };
    const next = applyAction(s, { type: "attack", attackerUid: "a", targetUid: "defender" });
    expect(combatEvent(s, next, 1)?.targetUid).toBe("defender");
    expect(combatEvent(s, next, 1)?.damages).toEqual([]);
  });
});