import { describe, expect, it } from "vitest";
import { canInspectCard, changeToPosition, fieldCardCommands, finishTurn } from "@/lib/arena-presentation";
import { createDuel } from "@/lib/duel-engine";
import type { CardData } from "@/data/catalog";

describe("card inspection privacy", () => {
  it("allows the viewer's own hand", () => expect(canInspectCard(0, 0, "hand")).toBe(true));
  it("does not reveal the opponent's hand", () => expect(canInspectCard(1, 0, "hand")).toBe(false));
  it("allows a face-up opponent field card", () => expect(canInspectCard(1, 0, "field", false)).toBe(true));
  it("does not reveal a face-down opponent field card", () => expect(canInspectCard(1, 0, "field", true)).toBe(false));
  it("allows a face-down own field card", () => expect(canInspectCard(0, 0, "field", true)).toBe(true));
  it("allows either public graveyard", () => expect(canInspectCard(1, 0, "graveyard")).toBe(true));
});

describe("field context-menu commands", () => {
  const card: CardData = { id: 1, name: "Monstro", kind: "monster", level: 4, atk: 1000, def: 1000, desc: "" };
  const setup = () => {
    const state = createDuel(["A", "B"], [Array(10).fill(card), Array(10).fill(card)], 1);
    state.turn = 3;
    state.players[0].monsters[0] = { uid: "m", card, faceDown: false, position: "atk", attacked: false, summonedTurn: 1 };
    return state;
  };
  it("changes to the requested defense position, without toggling an already defensive monster", () => {
    const next = changeToPosition(setup(), 0, "m", "def");
    expect(next.players[0].monsters[0]?.position).toBe("def");
    expect(changeToPosition(next, 0, "m", "def")).toBe(next);
  });
  it("changes defense to attack only when the existing rules allow it", () => {
    const state = setup();
    const monster = state.players[0].monsters[0];
    if (!monster) throw new Error("Missing monster");
    monster.position = "def";
    expect(changeToPosition(state, 0, "m", "atk").players[0].monsters[0]?.position).toBe("atk");
  });
  it("never lets a viewer control an opponent's monster", () => expect(fieldCardCommands(setup(), 0, 1, "m")).toEqual({ attack: false, toAttack: false, toDefense: false }));
  it("offers attack only in battle for an eligible own monster", () => {
    const state = setup();
    expect(fieldCardCommands(state, 0, 0, "m").attack).toBe(false);
    state.phase = "battle";
    expect(fieldCardCommands(state, 0, 0, "m").attack).toBe(true);
  });
  it("disallows position changes after a monster attacks or is summoned that turn", () => {
    const state = setup();
    const monster = state.players[0].monsters[0];
    if (!monster) throw new Error("Missing monster");
    monster.attacked = true;
    expect(fieldCardCommands(state, 0, 0, "m").toDefense).toBe(false);
    monster.attacked = false; monster.summonedTurn = state.turn;
    expect(fieldCardCommands(state, 0, 0, "m").toDefense).toBe(false);
  });
});

describe("end-turn panel action", () => {
  const card: CardData = { id: 1, name: "Test monster", kind: "monster", level: 4, atk: 1000, def: 1000, desc: "" };
  const setup = () => createDuel(["Você", "IA"], [Array(10).fill(card), Array(10).fill(card)], 42);
  it("starts both duelists at 8000 LP", () => {
    expect(setup().players.map((player) => player.lp)).toEqual([8000, 8000]);
  });
  it("ends the current turn and moves to the opponent's draw phase", () => {
    const next = finishTurn(setup());
    expect(next.active).toBe(1);
    expect(next.phase).toBe("draw");
    expect(next.turn).toBe(2);
  });
  it("cannot skip the required draw", () => {
    const state = { ...setup(), phase: "draw" as const };
    expect(finishTurn(state)).toBe(state);
  });
});