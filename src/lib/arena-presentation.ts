import type { CardData } from "@/data/catalog";
import type { DuelState, PlayerId } from "@/lib/duel-engine";
import { applyAction } from "@/lib/duel-engine";

export type CardLocation = "hand" | "field" | "graveyard";

/** Hidden opponent cards must not enter an inspector or an accessible name. */
export function canInspectCard(owner: PlayerId, viewer: PlayerId, location: CardLocation, faceDown = false) {
  return owner === viewer || location === "graveyard" || (location === "field" && !faceDown);
}

export function inspectableCard(card: CardData, owner: PlayerId, viewer: PlayerId, location: CardLocation, faceDown = false) {
  return canInspectCard(owner, viewer, location, faceDown) ? card : null;
}

/** Skip the remaining phases through the same reducer; do not invent turn rules. */
export function finishTurn(state: DuelState): DuelState {
  if (state.phase === "draw" || state.winner !== null || state.pending) return state;
  let next = state;
  for (let i = 0; i < 4 && next.active === state.active; i++) next = applyAction(next, { type: "nextPhase" });
  return next;
}