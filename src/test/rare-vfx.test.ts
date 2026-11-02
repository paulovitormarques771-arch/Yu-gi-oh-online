import { describe, expect, it } from "vitest";
import { attackFrame, rareAttackPath, rareProfile } from "@/lib/rare-vfx";
import { combatEvent } from "@/lib/arena-events";
import { applyAction, createDuel } from "@/lib/duel-engine";
import type { CardData } from "@/data/catalog";

const dragon: CardData = { id: 89631139, name: "Dragão Branco", kind: "monster", atk: 3000, def: 2500, level: 8, rarity: "lendaria", desc: "" };
const defender: CardData = { id: 7, name: "Defensor", kind: "monster", atk: 2000, def: 500, level: 4, desc: "" };
function battle(enemy = true) {
  const before = createDuel(["A", "B"], [Array(10).fill(dragon), Array(10).fill(defender)], 1);
  before.turn = 3; before.phase = "battle";
  before.players[0].monsters[4] = { uid: "dragon", card: dragon, position: "atk", faceDown: false, attacked: false, summonedTurn: 1 };
  if (enemy) before.players[1].monsters[1] = { uid: "defender", card: defender, position: "atk", faceDown: false, attacked: false, summonedTurn: 1 };
  const after = applyAction(before, { type: "attack", attackerUid: "dragon", ...(enemy ? { targetUid: "defender" } : {}) });
  return { before, after, event: combatEvent(before, after, 1) };
}
describe("rare holographic attacks", () => {
  it("emerges from the attacking card and reaches the actual enemy monster", () => {
    const { event, after } = battle();
    expect(event?.attackerIndex).toBe(4);
    expect(rareAttackPath(event, 0)).toEqual({ source: [2.34, 1.02], target: [-1.17, -1.02] });
    expect(after.players[1].lp).toBe(7000);
  });
  it("direct attacks travel to the opponent LP edge", () => {
    expect(rareAttackPath(battle(false).event, 0)?.target).toEqual([0, -3.3]);
  });
  it("mirrors the path for the opposing viewer", () => {
    expect(rareAttackPath(battle().event, 1)).toEqual({ source: [2.34, -1.02], target: [-1.17, 1.02] });
  });
  it("does not reveal a hidden attacker or launch on spell-only damage", () => {
    const event = battle().event;
    if (!event) throw new Error("Missing combat event");
    expect(rareAttackPath({ ...event, attackerCard: undefined } as never, 0)).toBeNull();
    expect(rareAttackPath({ ...event, battleResolved: false }, 0)).toBeNull();
  });
  it("uses distinct monster-specific breath, magic, solar and fist strikes", () => {
    expect(rareProfile(dragon).strike).toBe("breath");
    expect(rareProfile({ ...dragon, id: 46986414 }).strike).toBe("spell");
    expect(rareProfile({ ...dragon, id: 10000010 }).strike).toBe("solar");
    expect(rareProfile({ ...dragon, id: 10000000 }).strike).toBe("punch");
    expect(rareProfile({ ...dragon, id: 74677422 }).strike).toBe("fire");
  });
  it("emerges first, then strikes and fades within the existing battle window", () => {
    expect(attackFrame(0).emerge).toBe(0);
    expect(attackFrame(.4).projectile).toBe(false);
    expect(attackFrame(.8).projectile).toBe(true);
    expect(attackFrame(1.1).impact).toBe(true);
    expect(attackFrame(1.6).fade).toBe(0);
  });
});