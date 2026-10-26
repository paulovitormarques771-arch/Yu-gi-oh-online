import rawCards from "./cards.json";
import { cardImageUrl, type CardData, type CardKind } from "./catalog";

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

// Full classic-era catalog (Legend of Blue Eyes, Metal Raiders, Pharaoh's
// Servant, Spell Ruler) from the YGOPRODeck fan API.
export const ALL_CARDS: CardData[] = (rawCards as RawCard[]).map((c) => ({
  ...c,
  imageUrl: cardImageUrl(c.id),
}));

export const CARDS_BY_ID = new Map<number, CardData>(ALL_CARDS.map((c) => [c.id, c]));
