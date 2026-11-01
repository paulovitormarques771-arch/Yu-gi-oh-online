import { describe, expect, it } from "vitest";
import { applyAction, createDuel, type FieldMonster } from "@/lib/duel-engine";
import { combatEvent } from "@/lib/arena-events";
import type { CardData } from "@/data/catalog";

const card: CardData = { id: 1, name: "M", kind: "monster", level: 4, atk: 1000, def: 500, desc: "" };
const monster: FieldMonster = { uid: "a", card, position: "atk", faceDown: false, attacked: false, summonedTurn: 0 };
describe("actual combat presentation values", () => {
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