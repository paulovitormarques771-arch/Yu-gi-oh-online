import type { CardData } from "@/data/catalog";
import type { CombatEvent } from "@/lib/arena-events";
import { rareCard } from "@/lib/duel-setup";

export type HologramKind = "dragon" | "mage" | "colossus" | "demon";
export type StrikeKind = "breath" | "fire" | "thunder" | "solar" | "punch" | "spell";
export type EnergyRole = "cyan" | "gold" | "magic" | "damage";
export type RareProfile = { model: HologramKind; strike: StrikeKind; color: EnergyRole; scale: number };

const profiles: Record<number, RareProfile> = {
  89631139: { model: "dragon", strike: "breath", color: "cyan", scale: 1 },
  74677422: { model: "dragon", strike: "fire", color: "damage", scale: 1 },
  10000020: { model: "dragon", strike: "thunder", color: "damage", scale: 1.2 },
  10000010: { model: "dragon", strike: "solar", color: "gold", scale: 1.2 },
  10000000: { model: "colossus", strike: "punch", color: "cyan", scale: 1.2 },
  33396948: { model: "colossus", strike: "spell", color: "gold", scale: 1.15 },
  46986414: { model: "mage", strike: "spell", color: "magic", scale: 1 },
  38033121: { model: "mage", strike: "spell", color: "cyan", scale: .9 },
  70781052: { model: "demon", strike: "thunder", color: "magic", scale: 1 },
};

export function rareProfile(card: CardData): RareProfile {
  if (profiles[card.id]) return profiles[card.id];
  if (/dragon|dragão/i.test(card.race ?? "")) return { model: "dragon", strike: "breath", color: "cyan", scale: 1 };
  if (/warrior|guerreiro/i.test(card.race ?? "")) return { model: "colossus", strike: "punch", color: "gold", scale: 1 };
  if (/fiend|demônio/i.test(card.race ?? "")) return { model: "demon", strike: "thunder", color: "magic", scale: 1 };
  return { model: "mage", strike: "spell", color: "magic", scale: 1 };
}

/** Only resolved, publicly visible attackers can launch a hologram. */
export function rareAttackPath(event: CombatEvent | null | undefined, viewer: 0 | 1) {
  if (!event?.battleResolved || !event.attackerCard || !rareCard(event.attackerCard) || event.attackerIndex === undefined) return null;
  const own = event.owner === viewer;
  return {
    source: [(event.attackerIndex - 2) * 1.17, own ? 1.02 : -1.02] as const,
    target: [event.targetIndex === undefined ? 0 : (event.targetIndex - 2) * 1.17,
      event.targetIndex === undefined ? (own ? -3.3 : 3.3) : (own ? -1.02 : 1.02)] as const,
  };
}

/** Animation time is presentation-only; LP and destruction already come from the reducer. */
export function attackFrame(seconds: number) {
  const t = Math.max(0, seconds);
  const emerge = Math.min(1, t / .32);
  const strike = Math.max(0, Math.min(1, (t - .55) / .55));
  const fade = Math.max(0, Math.min(1, (1.6 - t) / .35));
  return { emerge, strike, fade, projectile: t >= .55 && t < 1.3, impact: t >= .95 && t < 1.5 };
}