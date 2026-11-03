import rawCards from "./cards.json";
import { CARDS, cardImageUrl, type CardData, type CardKind } from "./catalog";
import { CLASSIC_EXPANSION } from "./classic-expansion";

interface RawCard {
  id: number;
  name: string;
  kind: CardKind;
  type: string;
  race?: string;
  attribute?: string;
  level?: number;
  atk?: number;
  def?: number;
  desc: string;
}

// Classic-era catalog (Yu-Gi-Oh! Duel Monsters era sets + Egyptian Gods)
// Servant, Spell Ruler) from the YGOPRODeck fan API.
const expanded = [...rawCards as RawCard[], ...CLASSIC_EXPANSION.filter((c) => !(rawCards as RawCard[]).some((entry) => entry.id === c.id))];
export const ALL_CARDS: CardData[] = expanded.map((c) => {
  const rarity = CARDS.find((entry) => entry.id === c.id)?.rarity;
  return { ...c, ...(rarity ? { rarity } : {}), imageUrl: cardImageUrl(c.id) };
});

export const CARDS_BY_ID = new Map<number, CardData>(ALL_CARDS.map((c) => [c.id, c]));
