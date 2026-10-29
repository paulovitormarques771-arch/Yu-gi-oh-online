import { describe, expect, it } from "vitest";
import { canInspectCard, finishTurn } from "@/lib/arena-presentation";
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

describe("end-turn panel action", () => {
  const card: CardData = { id: 1, name: "Test monster", kind: "monster", level: 4, atk: 1000, def: 1000, desc: "" };
  const setup = () => createDuel(["Você", "IA"], [Array(10).fill(card), Array(10).fill(card)], 42);
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