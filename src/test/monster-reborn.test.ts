import { describe, expect, it } from "vitest";
import { CARDS_BY_ID } from "@/data/cards";
import { applyAction, createDuel, type PlayerId } from "@/lib/duel-engine";
import { activationError, graveyardEffectChoice } from "@/lib/arena-presentation";
import { spellEvent } from "@/lib/spell-cinematics";
import { aiNextAction } from "@/lib/duel-ai";

const card = (id: number) => { const found = CARDS_BY_ID.get(id); if (!found) throw new Error(`Missing ${id}`); return found; };
function setup(actor: PlayerId = 0) {
  const state = createDuel(["Você", "Oponente"], [Array(20).fill(card(70781052)), Array(20).fill(card(70781052))], 4);
  state.active = actor; state.turn = 3;
  state.players[actor].hand = [{ uid: "reborn", card: card(83764718) }];
  state.players[0].graveyard = [card(55144522), card(89631139)];
  state.players[1].graveyard = [card(46986414)];
  return state;
}
describe("Reviver Monstro cemetery selection", () => {
  it.each(["easy", "normal", "hard"] as const)("AI %s can activate and revive from the opponent cemetery", (difficulty) => {
    const state = setup(1); state.players[1].graveyard = [];
    let next = state;
    for (let step = 0; step < 4 && !next.players[1].monsters.some(Boolean); step++) next = applyAction(next, aiNextAction(next, difficulty));
    expect(next.players[1].monsters[0]?.card.id).toBe(89631139);
  });
  it.each([0, 1] as const)("revives from cemetery %i onto the activating player's field", (owner) => {
    const state = setup();
    const pending = applyAction(state, { type: "activateSpell", handUid: "reborn" });
    const choice = graveyardEffectChoice(pending, 0, owner, owner === 0 ? 1 : 0);
    if (!choice) throw new Error("Cemetery target unavailable");
    const next = applyAction(pending, { type: "resolveEffect", choice });
    const expected = owner === 0 ? 89631139 : 46986414;
    expect(next.players[0].monsters[0]?.card.id).toBe(expected);
    expect(next.players[0].monsters[0]?.faceDown).toBe(false);
    expect(next.players[1].monsters.every((monster) => monster === null)).toBe(true);
    expect(next.players[owner].graveyard.some((c) => c.id === expected)).toBe(false);
    expect(next.players[0].graveyard.filter((c) => c.id === 83764718)).toHaveLength(1);
    expect(next.players[0].normalSummoned).toBe(false);
    expect(next.pending).toBeNull();
    expect(spellEvent(pending, next, 1)).toMatchObject({ kind: "reborn", targetOwner: 0, targetIndex: 0 });
  });
  it("also revives onto player 1's field when player 1 activates", () => {
    const pending = applyAction(setup(1), { type: "activateSpell", actor: 1, handUid: "reborn" });
    const choice = graveyardEffectChoice(pending, 1, 0, 1);
    if (!choice) throw new Error("Target unavailable");
    const next = applyAction(pending, { type: "resolveEffect", actor: 1, choice });
    expect(next.players[1].monsters[0]?.card.id).toBe(89631139);
    expect(next.players[0].graveyard.map((c) => c.id)).toEqual([55144522]);
  });
  it("a set Monster Reborn also revives the selected opponent monster", () => {
    const set = applyAction(setup(), { type: "setSpell", handUid: "reborn" });
    const pending = applyAction(set, { type: "activateField", uid: "reborn" });
    const choice = graveyardEffectChoice(pending, 0, 1, 0);
    if (!choice) throw new Error("Target unavailable");
    const next = applyAction(pending, { type: "resolveEffect", choice });
    expect(next.players[0].monsters[0]?.card.id).toBe(46986414);
    expect(next.players[0].spells.every((spell) => spell === null)).toBe(true);
    expect(next.players[1].graveyard).toHaveLength(0);
    expect(next.players[0].graveyard.filter((c) => c.id === 83764718)).toHaveLength(1);
  });
  it("cemetery inspection cannot submit a spell as the revival target", () => {
    const pending = applyAction(setup(), { type: "activateSpell", handUid: "reborn" });
    expect(graveyardEffectChoice(pending, 0, 0, 0)).toBeUndefined();
    expect(graveyardEffectChoice(pending, 1, 0, 1)).toBeUndefined();
  });
  it("does not consume Monster Reborn if there is no monster in either cemetery", () => {
    const state = setup(); state.players.forEach((player) => { player.graveyard = []; });
    expect(activationError(state, { type: "activateSpell", handUid: "reborn" })).not.toBeNull();
    expect(state.players[0].hand[0]?.card.id).toBe(83764718);
  });
  it("cannot revive into a full field", () => {
    const state = setup(); state.players[0].monsters = Array.from({ length: 5 }, (_, index) => ({ uid: `m${index}`, card: card(70781052), position: "atk" as const, faceDown: false, attacked: false, summonedTurn: 1 }));
    expect(activationError(state, { type: "activateSpell", handUid: "reborn" })).not.toBeNull();
    expect(state.players[0].hand).toHaveLength(1);
  });
});