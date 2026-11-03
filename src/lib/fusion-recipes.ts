import type { CardData } from "@/data/catalog";

export type FusionMaterial = { owner: 0 | 1; zone: "hand" | "monster"; uid: string; card: CardData };
/** Named classic recipes only; arbitrary effect text is never executed. */
export const FUSION_RECIPES: Record<number, number[]> = {
  23995346: [89631139, 89631139, 89631139],
  11901678: [70781052, 74677422], 41462083: [71625222, 88819587],
  45231177: [34460851, 44287299], 66889139: [6368038, 28279543],
  98502113: [46986414, 78193831], 98502114: [46986414, 78193831],
};
export function fusionMaterials(fusion: CardData, pool: FusionMaterial[]): FusionMaterial[] | null {
  const recipe = FUSION_RECIPES[fusion.id]; if (!recipe) return null;
  const available = [...pool], selected: FusionMaterial[] = [];
  for (const id of recipe) {
    const index = available.findIndex((entry) => entry.card.id === id || id === 78193831 && entry.card.id === 78193832);
    const material = available[index]; if (!material) return null;
    selected.push(material); available.splice(index, 1);
  }
  return selected;
}