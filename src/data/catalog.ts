// Initial reference catalog. Names are kept as in the brief; no official artwork is bundled —
// cards render a named placeholder until an authorized asset is attached (imageUrl).

export type CardKind = "monster" | "spell" | "trap";
export type Rarity = "comum" | "rara" | "super" | "ultra" | "lendaria";

export interface CardData {
  id: string;
  name: string;
  kind: CardKind;
  attribute?: "TREVAS" | "LUZ" | "TERRA" | "ÁGUA" | "FOGO" | "VENTO" | "DIVINO";
  level?: number;
  type?: string;
  atk?: number | null; // null = "?"
  def?: number | null;
  text: string;
  rarity: Rarity;
  character?: string;
  imageUrl?: string;
}

export const CARDS: CardData[] = [
  { id: "mago-negro", name: "Mago Negro", kind: "monster", attribute: "TREVAS", level: 7, type: "Mago", atk: 2500, def: 2100, text: "O mago supremo em termos de ataque e defesa.", rarity: "ultra", character: "yami-yugi" },
  { id: "garota-maga-negra", name: "Garota Maga Negra", kind: "monster", attribute: "TREVAS", level: 6, type: "Mago", atk: 2000, def: 1700, text: "Ganha 300 ATK para cada \"Mago Negro\" nos Cemitérios.", rarity: "ultra", character: "yugi-muto" },
  { id: "dragao-branco", name: "Dragão Branco de Olhos Azuis", kind: "monster", attribute: "LUZ", level: 8, type: "Dragão", atk: 3000, def: 2500, text: "Este lendário dragão é uma poderosa máquina de destruição.", rarity: "lendaria", character: "seto-kaiba" },
  { id: "dragao-negro", name: "Dragão Negro de Olhos Vermelhos", kind: "monster", attribute: "TREVAS", level: 7, type: "Dragão", atk: 2400, def: 2000, text: "Um dragão feroz com um ataque mortal.", rarity: "ultra", character: "joey-wheeler" },
  { id: "exodia", name: "Exodia, o Proibido", kind: "monster", attribute: "TREVAS", level: 3, type: "Mago", atk: 1000, def: 1000, text: "Reúna as 5 peças na mão para vencer o Duelo.", rarity: "lendaria", character: "yugi-muto" },
  { id: "slifer", name: "Slifer, o Dragão Celeste", kind: "monster", attribute: "DIVINO", level: 10, type: "Divino", atk: null, def: null, text: "Ganha 1000 ATK/DEF para cada carta na sua mão.", rarity: "lendaria", character: "marik-ishtar" },
  { id: "obelisco", name: "Obelisco, o Atormentador", kind: "monster", attribute: "DIVINO", level: 10, type: "Divino", atk: 4000, def: 4000, text: "Requer 3 Tributos para ser Invocado.", rarity: "lendaria", character: "seto-kaiba" },
  { id: "dragao-ra", name: "Dragão Alado de Rá", kind: "monster", attribute: "DIVINO", level: 10, type: "Divino", atk: null, def: null, text: "O mais poderoso dos Deuses Egípcios.", rarity: "lendaria", character: "marik-ishtar" },
  { id: "caveira-invocada", name: "Caveira Invocada", kind: "monster", attribute: "TREVAS", level: 6, type: "Demônio", atk: 2500, def: 1200, text: "Um demônio com poderes sombrios para confundir o inimigo.", rarity: "super", character: "yugi-muto" },
  { id: "kuriboh", name: "Kuriboh", kind: "monster", attribute: "TREVAS", level: 1, type: "Demônio", atk: 300, def: 200, text: "Descarte esta carta para reduzir a 0 o dano de batalha.", rarity: "comum", character: "yugi-muto" },
  { id: "polimerizacao", name: "Polimerização", kind: "spell", text: "Invoque por Fusão 1 Monstro de Fusão do seu Deck Adicional.", rarity: "rara" },
  { id: "monstro-renascido", name: "Monstro Renascido", kind: "spell", text: "Escolha 1 monstro em qualquer Cemitério; Invoque-o por Invocação-Especial.", rarity: "super" },
  { id: "forca-espelho", name: "Força do Espelho", kind: "trap", text: "Quando um monstro do oponente declarar um ataque: destrua todos os monstros em Posição de Ataque dele.", rarity: "super" },
];

export interface Character {
  id: string;
  name: string;
  description: string;
  style: string;
  imageUrl?: string;
}

export const CHARACTERS: Character[] = [
  { id: "yugi-muto", name: "Yugi Muto", description: "Gentil e estratégico, guarda o Enigma do Milênio.", style: "Equilibrado" },
  { id: "yami-yugi", name: "Yami Yugi", description: "O Faraó sem nome, mestre dos jogos.", style: "Magos e combos" },
  { id: "seto-kaiba", name: "Seto Kaiba", description: "Gênio frio e implacável da Kaiba Corp.", style: "Força bruta" },
  { id: "joey-wheeler", name: "Joey Wheeler", description: "Coração de duelista e muita sorte.", style: "Sorte e guerreiros" },
  { id: "tea-gardner", name: "Téa Gardner", description: "A amizade é sua maior carta.", style: "Suporte" },
  { id: "tristan-taylor", name: "Tristan Taylor", description: "Leal e destemido.", style: "Máquinas" },
  { id: "mai-valentine", name: "Mai Valentine", description: "Elegante e calculista.", style: "Harpias" },
  { id: "pegasus", name: "Maximillion Pegasus", description: "Criador do jogo, dono do Olho do Milênio.", style: "Toons" },
  { id: "yami-bakura", name: "Yami Bakura", description: "Espírito sombrio do Anel do Milênio.", style: "Ocultismo" },
  { id: "marik-ishtar", name: "Marik Ishtar", description: "Líder dos Ghouls Raros.", style: "Controle" },
  { id: "ishizu-ishtar", name: "Ishizu Ishtar", description: "Guardiã que enxerga o futuro.", style: "Cemitério" },
  { id: "rex-raptor", name: "Rex Raptor", description: "Especialista em dinossauros.", style: "Dinossauros" },
  { id: "weevil-underwood", name: "Weevil Underwood", description: "Astuto colecionador de insetos.", style: "Insetos" },
  { id: "mako-tsunami", name: "Mako Tsunami", description: "Duelista dos mares.", style: "Água" },
  { id: "bandit-keith", name: "Bandit Keith", description: "Campeão americano sem escrúpulos.", style: "Máquinas" },
];
