import type { CardData } from "@/data/catalog";

/** Missing classic cards from the same YGOPRODeck source as the main catalog. */
export const CLASSIC_EXPANSION: CardData[] = [
  { id: 7359741, name: "Mechanicalchaser", kind: "monster", type: "Normal Monster", race: "Machine", attribute: "DARK", level: 4, atk: 1850, def: 800, desc: "Um caçador que persegue seu alvo sem descanso por ordem do Rei das Máquinas." },
  { id: 14898066, name: "Vorse Raider", kind: "monster", type: "Normal Monster", race: "Beast-Warrior", attribute: "DARK", level: 4, atk: 1900, def: 1200, desc: "Uma besta-guerreira cruel cujo machado carrega marcas de suas vítimas." },
  { id: 48766543, name: "Cyber-Tech Alligator", kind: "monster", type: "Normal Monster", race: "Machine", attribute: "WIND", level: 5, atk: 2500, def: 1600, desc: "Salvo por tecnologia avançada após ser ferido por um dragão, tornou-se um poderoso ciborgue." },
  { id: 35803249, name: "Jinzo - Lord", kind: "monster", type: "Effect Monster", race: "Machine", attribute: "DARK", level: 8, atk: 2600, def: 1600, desc: "Envie 1 Jinzo com a face para cima que você controla ao Cemitério para Invocar esta carta por Invocação-Especial. Armadilhas não podem ser ativadas e seus efeitos no campo são negados." },
  { id: 69162969, name: "Lightning Vortex", kind: "spell", type: "Spell Card", race: "Normal", desc: "Descarte 1 carta; destrua todos os monstros com a face para cima que seu oponente controla." },
  { id: 48130397, name: "Super Polymerization", kind: "spell", type: "Spell Card", race: "Quick-Play", desc: "Descarte 1 carta; Invoque por Fusão usando monstros de qualquer lado do campo. Não é possível responder a esta ativação." },
  { id: 23995346, name: "Blue-Eyes Ultimate Dragon", kind: "monster", type: "Fusion Monster", race: "Dragon", attribute: "LIGHT", level: 12, atk: 4500, def: 3800, desc: '"Dragão Branco de Olhos Azuis" + "Dragão Branco de Olhos Azuis" + "Dragão Branco de Olhos Azuis"' },
];
export const EXPANSION_TEXT: Record<number, { name: string; desc: string; community: boolean }> = {
  7359741: { name: "Caçador Mecânico", desc: CLASSIC_EXPANSION[0]?.desc ?? "", community: true },
  14898066: { name: "Vorse Raider", desc: CLASSIC_EXPANSION[1]?.desc ?? "", community: true },
  48766543: { name: "Jacaré Ciber-Tecnológico", desc: CLASSIC_EXPANSION[2]?.desc ?? "", community: true },
  35803249: { name: "Jinzo - Lord", desc: CLASSIC_EXPANSION[3]?.desc ?? "", community: true },
  69162969: { name: "Vórtice de Relâmpagos", desc: CLASSIC_EXPANSION[4]?.desc ?? "", community: true },
  48130397: { name: "Super Polimerização", desc: CLASSIC_EXPANSION[5]?.desc ?? "", community: true },
  23995346: { name: "Dragão Supremo de Olhos Azuis", desc: CLASSIC_EXPANSION[6]?.desc ?? "", community: true },
};