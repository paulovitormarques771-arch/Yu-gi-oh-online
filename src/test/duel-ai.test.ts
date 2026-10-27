import { describe, expect, it } from "vitest";
import { applyAction, createDuel, START_LP } from "@/lib/duel-engine";
import { aiNextAction } from "@/lib/duel-ai";
import type { CardData } from "@/data/catalog";

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
});
