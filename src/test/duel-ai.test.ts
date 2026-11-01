import { describe, expect, it } from "vitest";
import { applyAction, createDuel, START_LP } from "@/lib/duel-engine";
import { aiNextAction } from "@/lib/duel-ai";
import type { CardData } from "@/data/catalog";
import { emptyPlaystyle } from "@/lib/duel-training";

const deck = (a: number): CardData[] => Array.from({ length: 40 }, (_, i) => ({ id: i, name: `M${i}`, kind: "monster", atk: a, def: 500, level: 4, desc: "" }));

describe("AI opponent", () => {
  it("draws, summons and attacks directly during its turn", () => {
    let s = createDuel(["Você", "IA"], [deck(1000), deck(1500)], 3);
    s = applyAction(s, { type: "nextPhase" }); s = applyAction(s, { type: "nextPhase" }); // end turn 1
    let guard = 0;
    while (s.active === 1 && guard++ < 30) s = applyAction(s, aiNextAction(s));
    expect(s.active).toBe(0);
    expect(s.players[1].monsters.filter(Boolean)).toHaveLength(1);
    expect(s.players[0].lp).toBe(START_LP - 1500);
  });
  for (const difficulty of ["easy", "normal", "hard"] as const) {
    it(`${difficulty} attacks for lethal damage when it can win`, () => {
      const s = createDuel(["Você", "IA"], [deck(1000), deck(1500)], 3);
      s.turn = 2; s.active = 1; s.phase = "battle"; s.players[0].lp = 1000;
      s.players[1].monsters[0] = { uid: "killer", card: deck(1500)[0] ?? { id: 1, name: "M", kind: "monster", atk: 1500, def: 500, level: 4, desc: "" }, position: "atk", faceDown: false, attacked: false, summonedTurn: 2 };
      const action = aiNextAction(s, difficulty);
      expect(action.type).toBe("attack");
      expect(applyAction(s, action).winner).toBe(1);
    });
  }
  it("hard decisions do not change with concealed opponent card identities", () => {
    const s = createDuel(["Você", "IA"], [deck(1000), deck(2000)], 3);
    s.turn = 2; s.active = 1; s.phase = "battle";
    const mine = s.players[1].hand[0]; if (!mine) throw new Error("Missing card");
    s.players[1].monsters[0] = { uid: "a", card: mine.card, position: "atk", faceDown: false, attacked: false, summonedTurn: 2 };
    s.players[0].monsters[0] = { uid: "secret", card: { ...mine.card, atk: 10, def: 10 }, position: "def", faceDown: true, attacked: false, summonedTurn: 1 };
    const changed = structuredClone(s);
    const hidden = changed.players[0].monsters[0]; if (!hidden) throw new Error("Missing monster");
    hidden.card = { ...hidden.card, id: 54652250, atk: 9999, def: 9999 };
    changed.players[0].hand = deck(9999).slice(0, 5).map((card, i) => ({ uid: `secret-${i}`, card }));
    expect(aiNextAction(s, "hard", emptyPlaystyle())).toEqual(aiNextAction(changed, "hard", emptyPlaystyle()));
  });
  it("normal uses a destruction spell before fighting a stronger visible monster", () => {
    const s = createDuel(["Você", "IA"], [deck(3000), deck(1500)], 3);
    s.turn = 2; s.active = 1; s.phase = "main1";
    const h = s.players[0].hand[0]; if (!h) throw new Error("Missing card");
    s.players[0].monsters[0] = { uid: "threat", card: h.card, position: "atk", faceDown: false, attacked: false, summonedTurn: 1 };
    s.players[1].hand = [{ uid: "raigeki", card: { id: 12580477, name: "Raigeki", kind: "spell", desc: "" } }];
    expect(aiNextAction(s, "normal")).toMatchObject({ type: "activateSpell", handUid: "raigeki" });
  });
  it("normal activates Mirror Force against an incoming attack", () => {
    const s = createDuel(["Você", "IA"], [deck(2000), deck(1000)], 3);
    s.turn = 2; s.active = 0; s.phase = "battle";
    const h = s.players[0].hand[0]; if (!h) throw new Error("Missing card");
    s.players[0].monsters[0] = { uid: "a", card: h.card, position: "atk", faceDown: false, attacked: false, summonedTurn: 1 };
    s.players[1].spells[0] = { uid: "mirror", faceDown: true, setTurn: 1, card: { id: 44095762, name: "Mirror Force", kind: "trap", desc: "" } };
    const pending = applyAction(s, { type: "attack", attackerUid: "a" });
    expect(aiNextAction(pending, "normal")).toMatchObject({ type: "activateField", uid: "mirror" });
  });
});
