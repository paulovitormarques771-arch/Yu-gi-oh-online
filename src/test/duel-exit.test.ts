import { describe, expect, it } from "vitest";
import { CARDS_BY_ID } from "@/data/cards";
import { createDuel } from "@/lib/duel-engine";
import { roomExitState } from "@/lib/duel-setup";

function setup() {
  const card = CARDS_BY_ID.get(70781052); if (!card) throw new Error("Missing card");
  return createDuel(["Você", "Oponente"], [Array(20).fill(card), Array(20).fill(card)], 4);
}
describe("surrender and room cancellation", () => {
  it("the trainee can surrender even during the AI turn", () => {
    const state = setup(); state.active = 1;
    const exit = roomExitState(state, 0);
    expect(exit.status).toBe("finished"); expect(exit.state?.winner).toBe(1);
    expect(state.winner).toBeNull();
  });
  it.each([0, 1] as const)("online player %i forfeits to the other player", (seat) => {
    const exit = roomExitState(setup(), seat);
    expect(exit.status).toBe("finished"); expect(exit.state?.winner).toBe(seat === 0 ? 1 : 0);
    expect(exit.state?.pending).toBeNull();
  });
  it.each([0, 1] as const)("player %i closes preparation without starting a duel", (seat) => {
    expect(roomExitState({ kind: "setup", decks: [[70781052], null] }, seat)).toEqual({ status: "finished", state: null });
  });
  it("closes a newly created waiting room", () => expect(roomExitState(null, 0)).toEqual({ status: "finished", state: null }));
  it("does not reverse an already finished result", () => {
    const state = setup(); state.winner = 0;
    expect(roomExitState(state, 0).state?.winner).toBe(0);
  });
});