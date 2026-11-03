import type { CardData } from "@/data/catalog";

export type FieldTheme = "orichalcos" | "toon" | "ocean" | "dark" | "waste" | "mountain" | "forest" | "meadow";
export const FIELD_THEMES: Record<number, FieldTheme> = {
  48179391: "orichalcos", 15259703: "toon", 15259704: "toon", 22702055: "ocean", 59197169: "dark",
  23424603: "waste", 50913601: "mountain", 87430998: "forest", 86318356: "meadow",
};
export const isFieldSpell = (card: CardData) => card.kind === "spell" && (card.race === "Field" || FIELD_THEMES[card.id] !== undefined);
export const fieldIndestructible = (card: CardData) => card.id === 48179391;
export function activeField<T extends { card: CardData; faceDown: boolean; activatedOrder?: number }>(fields: (T | null | undefined)[]) {
  return fields.filter((f): f is T => !!f && !f.faceDown).sort((a, b) => (a.activatedOrder ?? 0) - (b.activatedOrder ?? 0) || a.card.id - b.card.id).at(-1);
}
const terrain: Record<number, { up: string[]; down?: string[] }> = {
  22702055: { up: ["Fish", "Sea Serpent", "Thunder", "Aqua"], down: ["Machine", "Pyro"] },
  59197169: { up: ["Fiend", "Spellcaster"], down: ["Fairy"] },
  23424603: { up: ["Dinosaur", "Zombie", "Rock"] }, 50913601: { up: ["Dragon", "Winged Beast", "Thunder"] },
  87430998: { up: ["Insect", "Beast", "Plant", "Beast-Warrior"] }, 86318356: { up: ["Warrior", "Beast-Warrior"] },
};
export function terrainBonus(field: CardData, monster: CardData) {
  const rule = terrain[field.id];
  if (!rule) return 0;
  return rule.up.includes(monster.race ?? "") ? 200 : rule.down?.includes(monster.race ?? "") ? -200 : 0;
}