import { describe, expect, it } from "vitest";
import { applyAction, createDuel, type DuelState } from "@/lib/duel-engine";
import type { CardData } from "@/data/catalog";
const card = (id: number, atk: number, def: number): CardData => ({ id, name: `M${id}`, kind: "monster", atk, def, desc: "" });
function fight(atk: number, defense: number, position: "atk" | "def"): DuelState {
  const a = card(1, atk, 1000), d = card(2, defense, defense);
  const s = createDuel(["A", "B"], [Array(20).fill(a), Array(20).fill(d)], 1);
  s.turn = 3; s.phase = "battle";
  s.players[0].monsters[0] = { uid: "a", card: a, position: "atk", faceDown: false, attacked: false, summonedTurn: 1 };
  s.players[1].monsters[0] = { uid: "d", card: d, position, faceDown: false, attacked: false, summonedTurn: 1 };
  return applyAction(s, { type: "attack", attackerUid: "a", targetUid: "d" });
}
describe("requested combat comparisons", () => {
  it("equal 2000 ATK destroys both and deals no LP damage", () => { const s = fight(2000, 2000, "atk"); expect(s.players.map((p) => p.monsters[0])).toEqual([null, null]); expect(s.players.map((p) => p.lp)).toEqual([8000, 8000]); });
  it("2500 ATK beats 2000 DEF, destroys defender only and deals zero damage", () => { const s = fight(2500, 2000, "def"); expect(s.players[0].monsters[0]?.uid).toBe("a"); expect(s.players[1].monsters[0]).toBeNull(); expect(s.players.map((p) => p.lp)).toEqual([8000, 8000]); });
  it("1500 ATK against 2000 DEF preserves both and costs attacker 500 LP", () => { const s = fight(1500, 2000, "def"); expect(s.players[0].monsters[0]?.uid).toBe("a"); expect(s.players[1].monsters[0]?.uid).toBe("d"); expect(s.players.map((p) => p.lp)).toEqual([7500, 8000]); });
  it("2000 ATK against 2000 DEF preserves both with no damage", () => { const s = fight(2000, 2000, "def"); expect(s.players[0].monsters[0]?.uid).toBe("a"); expect(s.players[1].monsters[0]?.uid).toBe("d"); expect(s.players.map((p) => p.lp)).toEqual([8000, 8000]); });
});