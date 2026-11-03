import type { CardData } from "@/data/catalog";

export type EffectTarget = "none" | "enemyMonster" | "ownMonster" | "monster" | "graveMonster" | "graveSpell" | "spellTrap" | "fieldDeck" | "fusion";
export type EffectTiming = "main" | "attack" | "summon" | "flip" | "passive";
export interface EffectDefinition { operation: string; target: EffectTarget; timing: EffectTiming; amount?: number; continuous?: boolean; discard?: number }

/** Explicit rules by card ID. Text translations are never interpreted as executable code. */
export const EFFECTS: Record<number, EffectDefinition> = {
  55144522: { operation: "draw", amount: 2, target: "none", timing: "main" },
  12580477: { operation: "destroyEnemy", target: "none", timing: "main" },
  53129443: { operation: "destroyAll", target: "none", timing: "main" },
  83764718: { operation: "revive", target: "graveMonster", timing: "main" },
  66788016: { operation: "fissure", target: "none", timing: "main" },
  5318639: { operation: "destroySpell", target: "spellTrap", timing: "main" },
  19613556: { operation: "destroyAllSpells", target: "none", timing: "main" },
  18144506: { operation: "destroyEnemySpells", target: "none", timing: "main" },
  19523799: { operation: "damage", amount: 800, target: "none", timing: "main" },
  46130346: { operation: "damage", amount: 500, target: "none", timing: "main" },
  76103675: { operation: "damage", amount: 200, target: "none", timing: "main" },
  38199696: { operation: "heal", amount: 500, target: "none", timing: "main" },
  84257639: { operation: "heal", amount: 1000, target: "none", timing: "main" },
  48179391: { operation: "orichalcos", target: "none", timing: "main", continuous: true },
  72302403: { operation: "swords", target: "none", timing: "main", continuous: true },
  40619825: { operation: "equip", amount: 1000, target: "monster", timing: "main", continuous: true },
  70046172: { operation: "boost", amount: 700, target: "monster", timing: "main" },
  44095762: { operation: "mirror", target: "none", timing: "attack" },
  62279055: { operation: "cylinder", target: "none", timing: "attack" },
  12607053: { operation: "waboku", target: "none", timing: "attack" },
  14315573: { operation: "negate", target: "none", timing: "attack" },
  4206964: { operation: "trapHole", target: "none", timing: "summon" },
  53582587: { operation: "destroyAll", target: "none", timing: "summon" },
  54652250: { operation: "bug", target: "monster", timing: "flip" },
  31560081: { operation: "faith", target: "graveSpell", timing: "flip" },
  7089711: { operation: "bounce", target: "monster", timing: "flip" },
  38033121: { operation: "magicianGirl", target: "none", timing: "passive" },
  10000020: { operation: "slifer", target: "none", timing: "passive" },
  33396948: { operation: "exodia", target: "none", timing: "passive" },
  77585513: { operation: "jinzo", target: "none", timing: "passive" },
  35803249: { operation: "jinzo", target: "none", timing: "passive" },
  78193831: { operation: "buster", target: "none", timing: "passive" },
  78193832: { operation: "buster", target: "none", timing: "passive" },
  60082869: { operation: "destroySpell", target: "spellTrap", timing: "attack" },
  56120475: { operation: "sakuretsu", target: "none", timing: "attack" },
  96355986: { operation: "javelin", target: "none", timing: "attack" },
  4031928: { operation: "control", target: "enemyMonster", timing: "main" },
  69162969: { operation: "destroyFaceUp", target: "none", timing: "main", discard: 1 },
  73628505: { operation: "terraform", target: "fieldDeck", timing: "main" },
  24094653: { operation: "fusion", target: "fusion", timing: "main" },
  48130397: { operation: "superFusion", target: "fusion", timing: "main", discard: 1 },
  15259703: { operation: "toon", target: "none", timing: "main", continuous: true },
  15259704: { operation: "toon", target: "none", timing: "main", continuous: true },
  22702055: { operation: "terrain", target: "none", timing: "main", continuous: true },
  59197169: { operation: "terrain", target: "none", timing: "main", continuous: true },
  23424603: { operation: "terrain", target: "none", timing: "main", continuous: true },
  50913601: { operation: "terrain", target: "none", timing: "main", continuous: true },
  87430998: { operation: "terrain", target: "none", timing: "main", continuous: true },
  86318356: { operation: "terrain", target: "none", timing: "main", continuous: true },
};

export function effectFor(card: CardData) { return EFFECTS[card.id]; }
export function hasPlayableEffect(card: CardData) {
  return card.kind === "monster" && /Normal Monster/.test(card.type ?? "") || !!effectFor(card);
}
export function effectStatus(card: CardData) {
  const effect = effectFor(card);
  if (effect?.timing === "flip") return "Efeito de virar automático · regras simplificadas";
  if (effect) return "Efeito implementado · regras simplificadas";
  if (card.kind === "monster" && (!card.type || card.type === "Normal Monster")) return "Monstro normal";
  return "Efeito ainda não implementado na arena";
}