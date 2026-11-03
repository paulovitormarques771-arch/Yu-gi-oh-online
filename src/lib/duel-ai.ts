// Tactical training AI. All decisions pass through the existing rules reducer.
import { applyAction, availableResponses, canAttack, monsterAtk, monsterDef, decisionPlayer, tributesNeeded, type Action, type DuelState, type PlayerId } from "@/lib/duel-engine";
import { effectFor } from "@/lib/duel-effects";
import { emptyPlaystyle, type AIDifficulty, type PlaystyleProfile } from "@/lib/duel-training";

export function aiNextAction(s: DuelState, difficulty: AIDifficulty = "normal", profile: PlaystyleProfile = emptyPlaystyle()): Action {
  const actor = decisionPlayer(s);
  const visible = planningState(s, actor, profile);
  if (difficulty === "easy") return easyAction(visible);
  const ranked = rankActions(visible, actor, profile);
  if (difficulty === "normal") return ranked[0]?.action ?? { type: "nextPhase", actor };
  const budget = { nodes: 0 };
  let best = ranked[0];
  let bestScore = -Infinity;
  for (const candidate of ranked.slice(0, 7)) {
    const score = search(candidate.next, actor, profile, 2, budget) + candidate.bias;
    if (score > bestScore) { bestScore = score; best = candidate; }
  }
  return best?.action ?? { type: "nextPhase", actor };
}

/** Remove concealed opponent information BEFORE any simulation or scoring. */
export function planningState(state: DuelState, actor: PlayerId, profile: PlaystyleProfile): DuelState {
  const s = structuredClone(state);
  const enemy = s.players[actor === 0 ? 1 : 0];
  const unknown = { id: -1, name: "Carta desconhecida", kind: "monster" as const, atk: 1400, def: profile.sets > profile.summons ? 1800 : 1400, level: 4, type: "Normal Monster", desc: "" };
  enemy.hand = enemy.hand.map((h) => ({ uid: h.uid, card: unknown }));
  enemy.deck = enemy.deck.map((h) => ({ uid: h.uid, card: unknown }));
  enemy.monsters = enemy.monsters.map((m) => m?.faceDown ? { ...m, card: unknown, boost: 0 } : m);
  enemy.spells = enemy.spells.map((m) => m?.faceDown ? { ...m, card: { ...unknown, kind: "trap", type: "Trap Card" } } : m);
  if (enemy.fieldSpell?.faceDown) enemy.fieldSpell = { ...enemy.fieldSpell, card: { ...unknown, kind: "spell", race: "Field" } };
  enemy.extraDeck = (enemy.extraDeck ?? []).map(() => ({ ...unknown, type: "Fusion Monster" }));
  return s;
}

function combinations(values: string[], count: number): string[][] {
  if (!count) return [[]];
  return values.flatMap((value, i) => combinations(values.slice(i + 1), count - 1).map((tail) => [value, ...tail]));
}

function candidates(s: DuelState): Action[] {
  const actor = decisionPlayer(s), p = s.players[actor], enemy = s.players[actor === 0 ? 1 : 0];
  if (s.pending?.kind === "effect") return s.pending.choices.map((choice) => ({ type: "resolveEffect", choice, actor }));
  if (s.pending?.kind === "response") return [...availableResponses(s).map((spell): Action => ({ type: "activateField", uid: spell.uid, actor })), { type: "passResponse", actor }];
  if (s.phase === "draw") return [{ type: "draw", actor }];
  const actions: Action[] = [{ type: "nextPhase", actor }];
  if (s.phase === "main1" || s.phase === "main2") {
    for (const h of p.hand) {
      if (h.card.kind === "monster") {
        if (p.normalSummoned && h.card.id !== 35803249 || /Fusion|Ritual/.test(h.card.type ?? "")) continue;
        const tr = h.card.id === 35803249 ? p.monsters.flatMap((m) => m?.card.id === 77585513 && !m.faceDown ? [[m.uid]] : []) : combinations(p.monsters.flatMap((m) => m ? [m.uid] : []), tributesNeeded(h.card.level));
        for (const tributes of tr) { actions.push({ type: "summon", handUid: h.uid, tributes, actor }, { type: "summon", handUid: h.uid, tributes, set: true, actor }); }
      } else {
        if (h.card.kind === "spell" && effectFor(h.card)?.timing === "main") actions.push({ type: "activateSpell", handUid: h.uid, actor });
        if (effectFor(h.card)) actions.push({ type: "setSpell", handUid: h.uid, actor });
      }
    }
    for (const m of p.monsters) if (m && m.summonedTurn !== s.turn && !m.attacked) actions.push({ type: "changePosition", uid: m.uid, actor });
    for (const m of p.monsters) if (m?.card.id === 35803249 && !m.faceDown && m.effectUsedTurn !== s.turn) actions.push({type: "activateMonster", uid: m.uid, actor});
    for (const spell of [...p.spells, p.fieldSpell]) if (spell?.faceDown && spell.card.kind === "spell" && effectFor(spell.card)?.timing === "main") actions.push({ type: "activateField", uid: spell.uid, actor });
  }
  if (s.phase === "battle") for (const m of p.monsters) {
    if (!m || !canAttack(s, m)) continue;
    const targets = enemy.monsters.filter((t) => t !== null);
    if (!targets.length) actions.push({ type: "attack", attackerUid: m.uid, actor });
    else for (const t of targets) actions.push({ type: "attack", attackerUid: m.uid, targetUid: t.uid, actor });
  }
  return actions;
}

function evaluate(s: DuelState, actor: PlayerId, profile: PlaystyleProfile): number {
  if (s.winner !== null) return s.winner === actor ? 1000000 : -1000000;
  const scorePlayer = (owner: PlayerId) => {
    const p = s.players[owner];
    const aggression = profile.attacks / Math.max(1, profile.summons);
    const board = p.monsters.reduce((sum, m) => {
      if (!m) return sum;
      const atk = monsterAtk(s, owner, m), def = monsterDef(s, owner, m);
      const strength = m.position === "atk" ? atk : def * (.72 + Math.min(.2, aggression * .05));
      return sum + 400 + strength * .45 + (m.faceDown && effectFor(m.card)?.timing === "flip" ? 280 : 0);
    }, 0);
    const spells = p.spells.reduce((sum, spell) => sum + (spell ? spell.faceDown ? 230 : 160 : 0), 0);
    const attacks = p.monsters.reduce((sum, m) => sum + (m && m.position === "atk" && !m.faceDown && !m.attacked ? Math.min(200, monsterAtk(s, owner, m) * .06) : 0), 0);
    return p.lp * .22 + board + p.hand.length * 120 + spells + attacks;
  };
  return scorePlayer(actor) - scorePlayer(actor === 0 ? 1 : 0);
}

function actionBias(s: DuelState, action: Action, actor: PlayerId, profile: PlaystyleProfile): number {
  const enemy = s.players[actor === 0 ? 1 : 0];
  if (action.type === "nextPhase") return -12;
  if (action.type === "attack") {
    const traps = enemy.spells.filter((m) => m?.faceDown).length;
    return 35 - traps * (20 + Math.min(420, profile.traps / Math.max(1, profile.attacks) * 280));
  }
  if (action.type === "activateSpell" || action.type === "activateField") {
    const card = action.type === "activateSpell" ? s.players[actor].hand.find((h) => h.uid === action.handUid)?.card : s.players[actor].spells.find((h) => h?.uid === action.uid)?.card;
    if (card && s.phase === "main2" && effectFor(card)?.operation === "boost") return -500;
  }
  return 0;
}

function rankActions(s: DuelState, actor: PlayerId, profile: PlaystyleProfile) {
  return candidates(s).flatMap((action) => {
    try {
      const next = applyAction(s, action);
      let score = evaluate(next, actor, profile);
      if (next.pending?.kind === "effect" && next.pending.actor === actor) {
        score = Math.max(...next.pending.choices.map((choice) => {
          try { return evaluate(applyAction(next, { type: "resolveEffect", choice, actor }), actor, profile); } catch { return -Infinity; }
        }));
      }
      const bias = actionBias(s, action, actor, profile);
      return [{ action, next, bias, score: score + bias }];
    } catch { return []; }
  }).sort((a, b) => b.score - a.score);
}

function search(s: DuelState, actor: PlayerId, profile: PlaystyleProfile, depth: number, budget: { nodes: number }): number {
  if (!depth || s.winner !== null || decisionPlayer(s) !== actor || budget.nodes >= 180) return evaluate(s, actor, profile);
  budget.nodes++;
  const choices = rankActions(s, actor, profile).slice(0, 4);
  return choices.length ? Math.max(...choices.map((c) => search(c.next, actor, profile, depth - 1, budget) + c.bias)) : evaluate(s, actor, profile);
}

function easyAction(s: DuelState): Action {
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
    const flip = me.monsters.find((m) => m?.faceDown && m.summonedTurn !== s.turn);
    if (flip) return { type: "changePosition", uid: flip.uid };
    const fieldMagic = [...me.spells, me.fieldSpell].find((m) => m?.faceDown && m.card.kind === "spell" && effectFor(m.card)?.timing === "main");
    if (fieldMagic) { try { const action: Action = { type: "activateField", uid: fieldMagic.uid }; applyAction(s, action); return action; } catch { /* Not every set spell has a valid target. */ } }
    const magic = me.hand.find((h) => {
      const effect = effectFor(h.card);
      if (h.card.kind !== "spell" || effect?.timing !== "main") return false;
      if (effect.continuous && !me.spells.some((m) => m === null)) return false;
      if (effect.target !== "none") return false;
      if (h.card.id === 83764718 && !me.monsters.some((m) => m === null)) return false;
      if (effect.operation === "destroyEnemy" || effect.operation === "fissure") return opp.monsters.some(Boolean);
      if (effect.operation === "destroyAll") return opp.monsters.filter(Boolean).length > me.monsters.filter(Boolean).length;
      return true;
    });
    if (magic) { try { const action: Action = { type: "activateSpell", handUid: magic.uid }; applyAction(s, action); return action; } catch { /* Continue with another legal move. */ } }
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
    const st = me.hand.find((h) => h.card.kind !== "monster" && !!effectFor(h.card));
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
        .filter((t) => (t.position === "atk" ? monsterAtk(s, actor === 0 ? 1 : 0, t) <= A : monsterDef(s, actor === 0 ? 1 : 0, t) < A))
        .sort((x, y) => (y.card.atk ?? 0) - (x.card.atk ?? 0));
      if (beatable[0]) return { type: "attack", attackerUid: a.uid, targetUid: beatable[0].uid };
    }
    return { type: "nextPhase" };
  }
  return { type: "nextPhase" };
}
