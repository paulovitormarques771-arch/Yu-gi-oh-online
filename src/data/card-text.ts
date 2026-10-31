import texts from "./card-texts.pt.json";
import type { CardData } from "./catalog";

type CardText = { name: string; desc: string; community: boolean };
const portuguese: Record<string, CardText> = texts;

export function cardText(card: CardData) {
  return portuguese[String(card.id)] ?? { name: card.name, desc: card.desc, community: true };
}

export const CARD_TYPE_PT: Record<string, string> = {
  "Normal Monster": "Monstro Normal", "Effect Monster": "Monstro de Efeito", "Flip Effect Monster": "Monstro de Efeito de Virar",
  "Fusion Monster": "Monstro de Fusão", "Ritual Monster": "Monstro Ritual", "Ritual Effect Monster": "Monstro Ritual de Efeito",
  "Spell Card": "Carta de Magia", "Trap Card": "Carta de Armadilha", Normal: "Normal", Continuous: "Contínua",
  "Quick-Play": "Rápida", Field: "Campo", Equip: "Equipamento", Ritual: "Ritual", Counter: "Contra-armadilha",
  Spellcaster: "Mago", Dragon: "Dragão", Warrior: "Guerreiro", "Beast-Warrior": "Besta-Guerreira", Fiend: "Demônio",
  Fairy: "Fada", Insect: "Inseto", Dinosaur: "Dinossauro", Machine: "Máquina", Rock: "Rocha", Aqua: "Aqua",
  Beast: "Besta", Zombie: "Zumbi", Fish: "Peixe", "Sea Serpent": "Serpente Marinha", Reptile: "Réptil",
  Pyro: "Piro", Thunder: "Trovão", Plant: "Planta", WingedBeast: "Besta Alada", "Winged Beast": "Besta Alada", "Divine-Beast": "Besta Divina",
};