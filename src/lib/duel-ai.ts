// Simple rule-based opponent: draws, summons its strongest playable monster,
// attacks when it wins (or directly), then ends the turn. Returns ONE action.
import { canAttack, tributesNeeded, type Action, type DuelState } from "@/lib/duel-engine";

export function aiNextAction(s: DuelState): Action {
  const me = s.players[s.active];
  const opp = s.players[s.active === 0 ? 1 : 0];
  if (s.phase === "draw") return { type: "draw" };

  if (s.phase === "main1") {
    if (!me.normalSummoned && me.monsters.some((m) => m === null)) {
      const own = me.monsters.filter(Boolean).sort((a, b) => (a!.card.atk ?? 0) - (b!.card.atk ?? 0));
      const playable = me.hand
        .filter((h) => h.card.kind === "monster" && !(h.card.type ?? "").match(/Fusion|Ritual/))
        .filter((h) => tributesNeeded(h.card.level) <= own.length)
        .sort((a, b) => (b.card.atk ?? 0) - (a.card.atk ?? 0));
      const pick = playable[0];
      if (pick) {
        const need = tributesNeeded(pick.card.level);
        const tributes = own.slice(0, need).map((m) => m!.uid);
        const tribAtk = own.slice(0, need).reduce((t, m) => t + (m!.card.atk ?? 0), 0);
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
      const targets = opp.monsters.filter(Boolean);
      if (targets.length === 0) return { type: "attack", attackerUid: a.uid };
      const A = a.card.atk ?? 0;
      const beatable = targets
        .filter((t) => (t!.position === "atk" ? (t!.card.atk ?? 0) < A : !t!.faceDown && (t!.card.def ?? 0) < A))
        .sort((x, y) => (y!.card.atk ?? 0) - (x!.card.atk ?? 0));
      if (beatable[0]) return { type: "attack", attackerUid: a.uid, targetUid: beatable[0].uid };
    }
    return { type: "nextPhase" };
  }
  return { type: "nextPhase" };
}
