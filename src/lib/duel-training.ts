import type { CardData } from "@/data/catalog";
import { hasPlayableEffect } from "@/lib/duel-effects";
import { quickDeck, shuffle, type Action, type DuelState } from "@/lib/duel-engine";

export type AIDifficulty = "easy" | "normal" | "hard";
export const DIFFICULTY_LABELS = { easy: "Fácil", normal: "Normal", hard: "Difícil" } as const;
export const isDifficulty = (value: unknown): value is AIDifficulty => value === "easy" || value === "normal" || value === "hard";
export const TRAINING_PROFILE_KEY = "duel-arena:training-profile:v1";
export interface PlaystyleProfile { actions: number; attacks: number; directAttacks: number; summons: number; sets: number; spells: number; traps: number; tributes: number }
export const emptyPlaystyle = (): PlaystyleProfile => ({ actions: 0, attacks: 0, directAttacks: 0, summons: 0, sets: 0, spells: 0, traps: 0, tributes: 0 });

/** Persist aggregate habits only: no card names, IDs, hands or account data. */
export function readPlaystyle(raw: string | null): PlaystyleProfile {
  const profile = emptyPlaystyle();
  try {
    const input: unknown = JSON.parse(raw ?? "null");
    if (!input || typeof input !== "object") return profile;
    for (const key of Object.keys(profile) as (keyof PlaystyleProfile)[]) {
      const value = (input as Record<string, unknown>)[key];
      if (typeof value === "number" && Number.isFinite(value)) profile[key] = Math.min(10000, Math.max(0, Math.floor(value)));
    }
  } catch { /* Storage may be unavailable or malformed. */ }
  return profile;
}

export function observePlaystyle(profile: PlaystyleProfile, before: DuelState, action: Action): PlaystyleProfile {
  const next = { ...profile, actions: Math.min(10000, profile.actions + 1) };
  if (action.type === "attack") { next.attacks++; if (!action.targetUid) next.directAttacks++; }
  if (action.type === "summon") { next.summons++; if (action.set) next.sets++; next.tributes += action.tributes?.length ?? 0; }
  if (action.type === "setSpell") next.sets++;
  if (action.type === "activateSpell") next.spells++;
  if (action.type === "activateField") { if (before.pending?.kind === "response") next.traps++; else next.spells++; }
  return next;
}

/** A hard opponent gets a tuned, legal 40-card deck, not extra LP or secret information. */
export function trainingDeck(pool: CardData[], seed: number, difficulty: AIDifficulty): CardData[] {
  if (difficulty !== "hard") return quickDeck(pool, seed);
  const low = shuffle(pool.filter((c) => c.kind === "monster" && (c.level ?? 0) <= 4 && hasPlayableEffect(c) && !/Fusion|Ritual/.test(c.type ?? "")), seed)
    .sort((a, b) => (b.atk ?? 0) - (a.atk ?? 0)).slice(0, 24);
  const high = pool.filter((c) => c.kind === "monster" && c.level === 5 && hasPlayableEffect(c)).sort((a, b) => (b.atk ?? 0) - (a.atk ?? 0)).slice(0, 2);
  const ids = [55144522, 12580477, 83764718, 44095762, 62279055, 4206964, 18144506, 48179391, 72302403, 40619825, 5318639, 66788016, 19523799, 14315573];
  const support = ids.flatMap((id) => { const c = pool.find((card) => card.id === id); return c ? [c] : []; });
  const deck = [...low, ...high, ...support];
  for (const card of quickDeck(pool, seed)) { if (deck.length >= 40) break; if (deck.filter((c) => c.id === card.id).length < 3) deck.push(card); }
  return deck.slice(0, 40);
}