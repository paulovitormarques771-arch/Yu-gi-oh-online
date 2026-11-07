import type { CardData } from "@/data/catalog";
import type { DuelState, PlayerId } from "@/lib/duel-engine";
import { applyAction, canAttack, decisionPlayer, type Action } from "@/lib/duel-engine";

export type CardLocation = "hand" | "field" | "graveyard";

/** Hidden opponent cards must not enter an inspector or an accessible name. */
export function canInspectCard(owner: PlayerId, viewer: PlayerId, location: CardLocation, faceDown = false) {
  return owner === viewer || location === "graveyard" || (location === "field" && !faceDown);
}

export function inspectableCard(card: CardData, owner: PlayerId, viewer: PlayerId, location: CardLocation, faceDown = false) {
  return canInspectCard(owner, viewer, location, faceDown) ? card : null;
}

/** Cemetery controls submit the reducer's exact pending choice, not a card-ID lookup. */
export function graveyardEffectChoice(state: DuelState, viewer: PlayerId, owner: PlayerId, index: number) {
  const pending = state.pending;
  if (state.winner !== null || pending?.kind !== "effect" || pending.actor !== viewer || pending.stage === "cost") return undefined;
  return pending.choices.find((choice) => choice.owner === owner && choice.zone === "graveyard" && choice.index === index);
}

/** Activation controls use the same legality checks as an actual move. */
export function activationError(state: DuelState, action: Action) {
  try { applyAction(state, action); return null; }
  catch (error) { return error instanceof Error ? error.message : "Ação indisponível."; }
}

/** Explicit menu destinations wrap the existing toggle, never introduce new position rules. */
export function fieldCardCommands(state: DuelState, owner: PlayerId, viewer: PlayerId, uid: string) {
  const monster = state.players[owner].monsters.find((entry) => entry?.uid === uid);
  const ownTurn = owner === viewer && state.active === viewer && decisionPlayer(state) === viewer && state.winner === null && !state.pending;
  const positionReady = ownTurn && !!monster && (state.phase === "main1" || state.phase === "main2") && monster.summonedTurn !== state.turn && !monster.attacked;
  return { attack: ownTurn && !!monster && canAttack(state, monster), toAttack: positionReady && monster?.position === "def", toDefense: positionReady && monster?.position === "atk" };
}

export function changeToPosition(state: DuelState, viewer: PlayerId, uid: string, position: "atk" | "def") {
  const allowed = fieldCardCommands(state, viewer, viewer, uid);
  if (!(position === "atk" ? allowed.toAttack : allowed.toDefense)) return state;
  return applyAction(state, { type: "changePosition", uid, actor: viewer });
}

/** Skip the remaining phases through the same reducer; do not invent turn rules. */
export function finishTurn(state: DuelState): DuelState {
  if (state.phase === "draw" || state.winner !== null || state.pending) return state;
  let next = state;
  for (let i = 0; i < 4 && next.active === state.active; i++) next = applyAction(next, { type: "nextPhase" });
  return next;
}