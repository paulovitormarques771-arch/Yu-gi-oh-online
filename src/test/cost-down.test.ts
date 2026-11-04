import { describe, expect, it } from "vitest";
import { CARDS_BY_ID } from "@/data/cards";
import { applyAction, createDuel, summonLevel, type FieldMonster } from "@/lib/duel-engine";
import { cardText } from "@/data/card-text";
const card = (id: number) => { const c = CARDS_BY_ID.get(id); if (!c) throw new Error(`Missing ${id}`); return c; };
const monster = (uid: string): FieldMonster => ({ uid, card: card(70781052), faceDown: false, position: "atk", attacked: false, summonedTurn: 1 });
describe("Reduzir Custos e Selo", () => {
  it("Cost Down discards 1 card and lowers hand levels by 2 this turn only", () => {
    const s = createDuel(["A", "B"], [Array(20).fill(card(89631139)), Array(20).fill(card(89631139))], 1);
    s.turn = 3; s.phase = "main1";
    s.players[0].hand = [{ uid: "cd", card: card(23265313) }, { uid: "be", card: card(89631139) }, { uid: "junk", card: card(70781052) }];
    s.players[0].monsters[0] = monster("t1"); s.players[0].monsters[1] = monster("t2");
    const p = applyAction(s, { type: "activateSpell", handUid: "cd" });
    const n = applyAction(p, { type: "resolveEffect", choice: { owner: 0, zone: "hand", uid: "junk" } });
    expect(n.players[0].hand.map((h) => h.uid)).toEqual(["be"]);
    expect(summonLevel(n, 0, card(89631139))).toBe(6);
    const summoned = applyAction(n, { type: "summon", handUid: "be", tributes: ["t1", "t2"] });
    expect(summoned.players[0].monsters.some((m) => m?.card.id === 89631139)).toBe(true);
    expect(summonLevel({ ...n, turn: 4 }, 0, card(89631139))).toBe(8);
  });
  it("Orichalcos text no longer mentions extra deck or once-per-duel limits", () => {
    expect(cardText(card(48179391)).desc).not.toMatch(/Deck Adicional|uma vez por Duelo/);
  });
});
