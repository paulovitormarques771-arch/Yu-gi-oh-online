import { describe, expect, it } from "vitest";
import { applyAction, createDuel, monsterAtk, quickDeck, type DuelState, type FieldMonster } from "@/lib/duel-engine";
import { CARDS_BY_ID, ALL_CARDS } from "@/data/cards";
import { cardText } from "@/data/card-text";
import { hasPlayableEffect } from "@/lib/duel-effects";
const card = (id: number) => { const c = CARDS_BY_ID.get(id); if (!c) throw new Error(`Missing ${id}`); return c; };
const monster = (id: string, cardId = 70781052): FieldMonster => ({ uid: id, card: card(cardId), position: "atk", faceDown: false, attacked: false, summonedTurn: 0 });
const setup = (): DuelState => createDuel(["A", "B"], [Array(20).fill(card(70781052)), Array(20).fill(card(70781052))], 4);
const hand = (s: DuelState, id: number) => { s.players[0].hand = [{ uid: "magic", card: card(id) }]; return s; };
describe("effects and custom rules", () => {
 it("rejects duplicate tribute monsters without mutating the input", () => {
  const s = setup(); s.players[0].hand = [{ uid: "high", card: card(38033121) }]; s.players[0].monsters[0] = monster("t");
  expect(() => applyAction(s, { type: "summon", handUid: "high", tributes: ["t", "t"] })).toThrow(); expect(s.players[0].monsters[0]?.uid).toBe("t");
 });
 it("sets monsters face-down and does not name the hidden card in the log", () => {
  const s = setup(); s.players[0].hand = [{ uid: "bug", card: card(54652250) }]; const n = applyAction(s, { type: "summon", handUid: "bug", set: true });
  expect(n.players[0].monsters[0]?.faceDown).toBe(true); expect(n.players[0].monsters[0]?.position).toBe("def"); expect(n.log.at(-1)).toBe("A baixou um monstro.");
 });
 it("Pot of Greed actually draws two cards", () => { const s = hand(setup(), 55144522); const n = applyAction(s, { type: "activateSpell", handUid: "magic" }); expect(n.players[0].hand).toHaveLength(2); expect(n.players[0].deck).toHaveLength(13); expect(n.players[0].graveyard[0]?.id).toBe(55144522); });
 it("Raigeki destroys opponent monsters only", () => { const s = hand(setup(), 12580477); s.players[0].monsters[0] = monster("own"); s.players[1].monsters[0] = monster("enemy"); const n = applyAction(s, { type: "activateSpell", handUid: "magic" }); expect(n.players[1].monsters[0]).toBeNull(); expect(n.players[0].monsters[0]?.uid).toBe("own"); });
 it("Monster Reborn waits for a valid graveyard target", () => { const s = hand(setup(), 83764718); s.players[1].graveyard = [card(70781052)]; const p = applyAction(s, { type: "activateSpell", handUid: "magic" }); expect(p.pending?.kind).toBe("effect"); expect(() => applyAction(p, { type: "resolveEffect", choice: {owner: 1, zone: "graveyard", index: 5} })).toThrow(); const n = applyAction(p, { type: "resolveEffect", choice: {owner: 1, zone: "graveyard", index: 0} }); expect(n.players[0].monsters[0]?.card.id).toBe(70781052); expect(n.players[1].graveyard).toHaveLength(0); });
 it("Mirror Force gives the defender a response and stops damage", () => { const s = setup(); s.turn = 2; s.phase = "battle"; s.players[0].monsters[0] = monster("attacker"); s.players[1].spells[0] = {uid: "trap", card: card(44095762), faceDown: true, setTurn: 1}; const p = applyAction(s, { type: "attack", attackerUid: "attacker" }); expect(p.pending?.actor).toBe(1); expect(() => applyAction(p, {type: "passResponse", actor: 0})).toThrow(); const n = applyAction(p, {type: "activateField", uid: "trap", actor: 1}); expect(n.players[0].monsters[0]).toBeNull(); expect(n.players[1].lp).toBe(8000); });
 it("a trap cannot activate on the turn it is set", () => { const s = setup(); s.turn = 2; s.phase = "battle"; s.players[0].monsters[0] = monster("attacker"); s.players[1].spells[0] = {uid: "trap", card: card(44095762), faceDown: true, setTurn: 2}; const n = applyAction(s, {type: "attack", attackerUid: "attacker"}); expect(n.pending).toBeNull(); expect(n.players[1].lp).toBe(5500); });
 it("flip Man-Eater Bug requires and resolves a monster target", () => { const s = setup(); s.turn = 2; s.phase = "battle"; s.players[0].monsters[0] = monster("attacker"); s.players[1].monsters[0] = {...monster("bug", 54652250), faceDown: true, position: "def"}; const p = applyAction(s, {type: "attack", attackerUid: "attacker", targetUid: "bug"}); expect(p.pending?.actor).toBe(1); const n = applyAction(p, {type: "resolveEffect", actor: 1, choice: {owner: 0, zone: "monster", uid: "attacker"}}); expect(n.players[0].monsters[0]).toBeNull(); expect(n.players[1].monsters[0]?.faceDown).toBe(false); });
 it("Orichalcos raises ATK by 500 while present", () => { const s = hand(setup(), 48179391); s.players[0].monsters[0] = monster("own"); const n = applyAction(s, {type: "activateSpell", handUid: "magic"}); const m = n.players[0].monsters[0]; if (!m) throw new Error("Missing monster"); expect(monsterAtk(n, 0, m)).toBe(3000); });
 it("rejects fusion without a valid recipe instead of consuming it", () => { const s = hand(setup(), 24094653); expect(() => applyAction(s, {type: "activateSpell", handUid: "magic"})).toThrow(); expect(s.players[0].hand).toHaveLength(1); });
 it("automatic decks contain only supported effects or normal monsters", () => expect(quickDeck(ALL_CARDS, 10).every(hasPlayableEffect)).toBe(true));
 it("Portuguese descriptions cover monsters, spells and traps", () => { for (const c of ALL_CARDS) expect(cardText(c).desc.length).toBeGreaterThan(0); expect(cardText(card(55144522)).desc).toBe("Compre 2 cards."); expect(cardText(card(44095762)).desc).toContain("oponente"); expect(cardText(card(54652250)).desc).toContain("monstro"); });
});
