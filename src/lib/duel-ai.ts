// Simple rule-based opponent: draws, summons its strongest playable monster,
// attacks when it wins (or directly), then ends the turn. Returns ONE action.
import { availableResponses, canAttack, effectChoices, monsterAtk, monsterDef, decisionPlayer, tributesNeeded, type Action, type DuelState } from "@/lib/duel-engine";
import { effectFor } from "@/lib/duel-effects";

export function aiNextAction(s: DuelState): Action {
  const actor = decisionPlayer(s);
  const me = s.players[actor];
  const opp = s.players[actor === 0 ? 1 : 0];
  if (s.pending?.kind === "effect") {
    const choices = s.pending.choices;
    const pick = choices.find((c) => s.pending?.kind === "effect" && (s.pending.sourceCard.id === 83764718 || s.pending.sourceCard.id === 40619825 ? c.owner === actor : c.owner !== actor)) ?? choices[0];
    return pick ? { type: "resolveEffect", choice: pick, actor } : { type: "cancelEffect", actor };
  }
  if (s.pending?.kind === "response") {
    const trap = availableResponses(s)[0];
    return trap ? { type: "activateField", uid: trap.uid, actor } : { type: "passResponse", actor };
  }
  if (s.phase === "draw") return { type: "draw" };

  if (s.phase === "main1") {
    const magic = me.hand.find((h) => {
      const effect = effectFor(h.card);
      if (h.card.kind !== "spell" || effect?.timing !== "main") return false;
      if (effect.continuous && !me.spells.some((m) => m === null)) return false;
      if (effect.target !== "none" && !effectChoices(s, actor, h.card, h.uid).length) return false;
      if (h.card.id === 83764718 && !me.monsters.some((m) => m === null)) return false;
      if (effect.operation === "destroyEnemy" || effect.operation === "fissure") return opp.monsters.some(Boolean);
      if (effect.operation === "destroyAll") return opp.monsters.filter(Boolean).length > me.monsters.filter(Boolean).length;
      return true;
    });
    if (magic) return { type: "activateSpell", handUid: magic.uid };
    if (!me.normalSummoned && me.monsters.some((m) => m === null)) {
      const own = me.monsters.filter((m) => m !== null).sort((a, b) => monsterAtk(s, actor, a) - monsterAtk(s, actor, b));
      const playable = me.hand
        .filter((h) => h.card.kind === "monster" && !(h.card.type ?? "").match(/Fusion|Ritual/))
        .filter((h) => tributesNeeded(h.card.level) <= own.length)
        .sort((a, b) => (b.card.atk ?? 0) - (a.card.atk ?? 0));
      const pick = playable[0];
      if (pick) {
        const need = tributesNeeded(pick.card.level);
        const tributes = own.slice(0, need).map((m) => m.uid);
        const tribAtk = own.slice(0, need).reduce((t, m) => t + monsterAtk(s, actor, m), 0);
        if (need === 0 || (pick.card.atk ?? 0) > tribAtk) {
          const strongestOpp = Math.max(0, ...opp.monsters.map((m) => (m && !m.faceDown ? m.card.atk ?? 0 : 0)));
          return { type: "summon", handUid: pick.uid, tributes, set: (pick.card.atk ?? 0) < strongestOpp };
        }
      }
    }
    const st = me.hand.find((h) => h.card.kind !== "monster");
    if (st && me.spells.some((x) => x === null)) return { type: "setSpell", handUid: st.uid };
    return { type: "nextPhase" };
  }

  if (s.phase === "battle") {
    for (const a of me.monsters) {
      if (!a || !canAttack(s, a)) continue;
      const targets = opp.monsters.filter((m) => m !== null);
      if (targets.length === 0) return { type: "attack", attackerUid: a.uid };
      const A = monsterAtk(s, actor, a);
      const beatable = targets
        .filter((t) => (t.position === "atk" ? monsterAtk(s, actor === 0 ? 1 : 0, t) < A : !t.faceDown && monsterDef(s, actor === 0 ? 1 : 0, t) < A))
        .sort((x, y) => (y.card.atk ?? 0) - (x.card.atk ?? 0));
      if (beatable[0]) return { type: "attack", attackerUid: a.uid, targetUid: beatable[0].uid };
    }
    return { type: "nextPhase" };
  }
  return { type: "nextPhase" };
}
