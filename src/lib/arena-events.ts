import type { CardData } from "@/data/catalog";
import type { AttackContext, DuelState, PlayerId } from "@/lib/duel-engine";
import { rareCard } from "@/lib/duel-setup";

export type CombatEvent = {
  id: number; owner: PlayerId; attackerUid?: string; targetUid?: string; targetIndex?: number; battleResolved: boolean;
  attackerCard?: CardData; targetCard?: CardData; damages: { owner: PlayerId; amount: number }[];
  destroyed: { uid: string; owner: PlayerId; card: CardData; index: number }[];
};

/** State deltas cover human, AI, trap responses and realtime updates alike. */
export function combatEvent(before: DuelState, after: DuelState, id: number): CombatEvent | null {
  if (after.turn < before.turn || (before.winner !== null && after.winner === null)) return null;
  let attack: AttackContext | undefined;
  if (after.lastBattle && after.lastBattle.sequence !== before.lastBattle?.sequence) attack = after.lastBattle;
  if (!attack && before.pending?.kind === "response") attack = before.pending.attack;
  if (!attack && before.pending?.kind === "effect") attack = before.pending.afterAttack;
  if (!attack) {
    for (const owner of [0, 1] as const) {
      const monster = after.players[owner].monsters.find((m) => m?.attacked && !before.players[owner].monsters.find((old) => old?.uid === m.uid)?.attacked);
      if (monster && !after.pending) attack = { owner, attackerUid: monster.uid };
    }
  }
  if (after.pending) attack = undefined;
  const damages = ([0, 1] as const).flatMap((owner) => {
    const amount = before.players[owner].lp - after.players[owner].lp;
    return amount > 0 ? [{ owner, amount }] : [];
  });
  const destroyed = ([0, 1] as const).flatMap((owner) => before.players[owner].monsters.flatMap((m, index) => {
    if (!m || after.players[owner].monsters.some((n) => n?.uid === m.uid)) return [];
    // Face-down identities remain private even when a tribute/destroy effect removes them.
    if (m.faceDown) return [];
    return [{ uid: m.uid, owner, card: m.card, index }];
  }));
  if (!attack && !damages.length && !destroyed.length) return null;
  const owner = attack?.owner ?? (damages[0]?.owner === 0 ? 1 : 0);
  const enemy: PlayerId = owner === 0 ? 1 : 0;
  const a = before.players[owner].monsters.find((m) => m?.uid === attack?.attackerUid);
  const hit = attack?.targetUid ? before.players[enemy].monsters.find((m) => m?.uid === attack?.targetUid) : undefined;
  const targetIndex = attack?.targetUid ? before.players[enemy].monsters.findIndex((m) => m?.uid === attack?.targetUid) : -1;
  return { id, owner, battleResolved: !!after.lastBattle && after.lastBattle.sequence !== before.lastBattle?.sequence, ...(attack ? { attackerUid: attack.attackerUid, targetUid: attack.targetUid } : {}),
    ...(targetIndex >= 0 ? { targetIndex } : {}),
    ...(a && !a.faceDown ? { attackerCard: a.card } : {}), ...(hit && !hit.faceDown ? { targetCard: hit.card } : {}), damages, destroyed };
}

export type RareSummonEvent = { id: number; monsters: { uid: string; owner: PlayerId; index: number; card: CardData }[] };

export function rareSummonEvent(before: DuelState, after: DuelState, id: number): RareSummonEvent | null {
  const monsters = ([0, 1] as const).flatMap((owner) => after.players[owner].monsters.flatMap((monster, index) => {
    if (!monster || monster.faceDown || !rareCard(monster.card)) return [];
    const old = before.players[owner].monsters.find((entry) => entry?.uid === monster.uid);
    return !old || old.faceDown ? [{ uid: monster.uid, owner, index, card: monster.card }] : [];
  }));
  return monsters.length ? { id, monsters } : null;
}