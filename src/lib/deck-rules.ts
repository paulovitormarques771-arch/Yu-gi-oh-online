export const MAX_DECK_SIZE = 45;
export const MAX_COPIES = 3;

export interface DeckEntry {
  cardId: number;
  copies: number;
}

export function totalCards(entries: DeckEntry[]): number {
  return entries.reduce((sum, e) => sum + e.copies, 0);
}

export function copiesOf(entries: DeckEntry[], cardId: number): number {
  return entries.find((e) => e.cardId === cardId)?.copies ?? 0;
}

export function canAddCard(entries: DeckEntry[], cardId: number): { ok: boolean; reason?: string } {
  if (copiesOf(entries, cardId) >= MAX_COPIES) {
    return { ok: false, reason: "Máximo de 3 cópias da mesma carta." };
  }
  if (totalCards(entries) >= MAX_DECK_SIZE) {
    return { ok: false, reason: "O deck já tem o máximo de 45 cartas." };
  }
  return { ok: true };
}

export function addCard(entries: DeckEntry[], cardId: number): DeckEntry[] {
  if (!canAddCard(entries, cardId).ok) return entries;
  const existing = entries.find((e) => e.cardId === cardId);
  if (existing) {
    return entries.map((e) => (e.cardId === cardId ? { ...e, copies: e.copies + 1 } : e));
  }
  return [...entries, { cardId, copies: 1 }];
}

export function removeCard(entries: DeckEntry[], cardId: number): DeckEntry[] {
  const existing = entries.find((e) => e.cardId === cardId);
  if (!existing) return entries;
  if (existing.copies <= 1) return entries.filter((e) => e.cardId !== cardId);
  return entries.map((e) => (e.cardId === cardId ? { ...e, copies: e.copies - 1 } : e));
}
