// Reference catalog. Card images come from the YGOPRODeck CDN (free fan-project API);
// character portraits are original AI-generated art created for this project.

import yugiMuto from "@/assets/characters/yugi-muto.jpg";
// Yami Yugi shares Yugi's portrait (same character in the anime).
const yamiYugi = yugiMuto;
import setoKaiba from "@/assets/characters/seto-kaiba.jpg";
import joeyWheeler from "@/assets/characters/joey-wheeler.jpg";
import teaGardner from "@/assets/characters/tea-gardner.jpg";
import tristanTaylor from "@/assets/characters/tristan-taylor.jpg";
import maiValentine from "@/assets/characters/mai-valentine.jpg";
import pegasus from "@/assets/characters/pegasus.jpg";
import yamiBakura from "@/assets/characters/yami-bakura.jpg";
import marikIshtar from "@/assets/characters/marik-ishtar.jpg";
import ishizuIshtar from "@/assets/characters/ishizu-ishtar.jpg";
import rexRaptor from "@/assets/characters/rex-raptor.jpg";
import weevilUnderwood from "@/assets/characters/weevil-underwood.jpg";
import makoTsunami from "@/assets/characters/mako-tsunami.jpg";
import banditKeith from "@/assets/characters/bandit-keith.jpg";

export type CardKind = "monster" | "spell" | "trap";
export type Rarity = "comum" | "rara" | "super" | "ultra" | "lendaria";

export interface CardData {
  id: number;
  name: string;
  kind: CardKind;
  type?: string;
  race?: string;
  attribute?: string;
  level?: number;
  atk?: number | null;
  def?: number | null;
  desc: string;
  rarity?: Rarity;
  character?: string;
  imageUrl?: string;
}

export const cardImageUrl = (id: number) => `https://images.ygoprodeck.com/images/cards/${id}.jpg`;
export const cardImageSmallUrl = (id: number) => `https://images.ygoprodeck.com/images/cards_small/${id}.jpg`;

export const ATTRIBUTE_LABELS: Record<string, string> = {
  DARK: "TREVAS",
  LIGHT: "LUZ",
  EARTH: "TERRA",
  WATER: "ÁGUA",
  FIRE: "FOGO",
  WIND: "VENTO",
  DIVINE: "DIVINO",
};

// Iconic cards for the landing page (ids match the YGOPRODeck CDN).
export const CARDS: CardData[] = [
  { id: 46986414, name: "Mago Negro", kind: "monster", attribute: "DARK", level: 7, race: "Mago", atk: 2500, def: 2100, desc: "O mago supremo em termos de ataque e defesa.", rarity: "ultra", character: "yami-yugi", imageUrl: cardImageUrl(46986414) },
  { id: 38033121, name: "Garota Maga Negra", kind: "monster", attribute: "DARK", level: 6, race: "Mago", atk: 2000, def: 1700, desc: "Ganha 300 ATK para cada \"Mago Negro\" nos Cemitérios.", rarity: "ultra", character: "yugi-muto", imageUrl: cardImageUrl(38033121) },
  { id: 89631139, name: "Dragão Branco de Olhos Azuis", kind: "monster", attribute: "LIGHT", level: 8, race: "Dragão", atk: 3000, def: 2500, desc: "Este lendário dragão é uma poderosa máquina de destruição.", rarity: "lendaria", character: "seto-kaiba", imageUrl: cardImageUrl(89631139) },
  { id: 74677422, name: "Dragão Negro de Olhos Vermelhos", kind: "monster", attribute: "DARK", level: 7, race: "Dragão", atk: 2400, def: 2000, desc: "Um dragão feroz com um ataque mortal.", rarity: "ultra", character: "joey-wheeler", imageUrl: cardImageUrl(74677422) },
  { id: 33396948, name: "Exodia, o Proibido", kind: "monster", attribute: "DARK", level: 3, race: "Mago", atk: 1000, def: 1000, desc: "Reúna as 5 peças na mão para vencer o Duelo.", rarity: "lendaria", character: "yugi-muto", imageUrl: cardImageUrl(33396948) },
  { id: 10000020, name: "Slifer, o Dragão Celeste", kind: "monster", attribute: "DIVINE", level: 10, race: "Divino", atk: null, def: null, desc: "Ganha 1000 ATK/DEF para cada carta na sua mão.", rarity: "lendaria", character: "marik-ishtar", imageUrl: cardImageUrl(10000020) },
  { id: 10000000, name: "Obelisco, o Atormentador", kind: "monster", attribute: "DIVINE", level: 10, race: "Divino", atk: 4000, def: 4000, desc: "Requer 3 Tributos para ser Invocado.", rarity: "lendaria", character: "seto-kaiba", imageUrl: cardImageUrl(10000000) },
  { id: 10000010, name: "Dragão Alado de Rá", kind: "monster", attribute: "DIVINE", level: 10, race: "Divino", atk: null, def: null, desc: "O mais poderoso dos Deuses Egípcios.", rarity: "lendaria", character: "marik-ishtar", imageUrl: cardImageUrl(10000010) },
  { id: 70781052, name: "Caveira Invocada", kind: "monster", attribute: "DARK", level: 6, race: "Demônio", atk: 2500, def: 1200, desc: "Um demônio com poderes sombrios para confundir o inimigo.", rarity: "super", character: "yugi-muto", imageUrl: cardImageUrl(70781052) },
  { id: 40640057, name: "Kuriboh", kind: "monster", attribute: "DARK", level: 1, race: "Demônio", atk: 300, def: 200, desc: "Descarte esta carta para reduzir a 0 o dano de batalha.", rarity: "comum", character: "yugi-muto", imageUrl: cardImageUrl(40640057) },
  { id: 24094653, name: "Polimerização", kind: "spell", desc: "Invoque por Fusão 1 Monstro de Fusão do seu Deck Adicional.", rarity: "rara", imageUrl: cardImageUrl(24094653) },
  { id: 83764718, name: "Monstro Renascido", kind: "spell", desc: "Escolha 1 monstro em qualquer Cemitério; Invoque-o por Invocação-Especial.", rarity: "super", imageUrl: cardImageUrl(83764718) },
  { id: 44095762, name: "Força do Espelho", kind: "trap", desc: "Quando um monstro do oponente declarar um ataque: destrua todos os monstros em Posição de Ataque dele.", rarity: "super", imageUrl: cardImageUrl(44095762) },
  { id: 77585513, name: "Jinzo", kind: "monster", race: "Machine", level: 6, atk: 2400, def: 1500, attribute: "DARK", rarity: "ultra", desc: "Armadilhas não podem ser ativadas e seus efeitos no campo são negados.", imageUrl: cardImageUrl(77585513) },
  { id: 35803249, name: "Jinzo - Lord", kind: "monster", race: "Machine", level: 8, atk: 2600, def: 1600, attribute: "DARK", rarity: "ultra", desc: "Invocação-Especial enviando um Jinzo com a face para cima ao Cemitério. Nega armadilhas.", imageUrl: cardImageUrl(35803249) },
  { id: 78193831, name: "Buster Blader", kind: "monster", race: "Warrior", level: 7, atk: 2600, def: 2300, rarity: "super", desc: "Ganha 500 ATK para cada Dragão no campo ou Cemitério do oponente.", imageUrl: cardImageUrl(78193831) },
  { id: 23995346, name: "Dragão Supremo de Olhos Azuis", kind: "monster", race: "Dragon", level: 12, atk: 4500, def: 3800, rarity: "lendaria", desc: "Fusão de três Dragões Brancos de Olhos Azuis.", imageUrl: cardImageUrl(23995346) },
];

export interface Character {
  id: string;
  name: string;
  description: string;
  style: string;
  imageUrl: string;
}

export const CHARACTERS: Character[] = [
  { id: "yugi-muto", name: "Yugi Muto", description: "Gentil e estratégico, guarda o Enigma do Milênio.", style: "Equilibrado", imageUrl: yugiMuto },
  { id: "yami-yugi", name: "Yami Yugi", description: "O Faraó sem nome, mestre dos jogos.", style: "Magos e combos", imageUrl: yamiYugi },
  { id: "seto-kaiba", name: "Seto Kaiba", description: "Gênio frio e implacável da Kaiba Corp.", style: "Força bruta", imageUrl: setoKaiba },
  { id: "joey-wheeler", name: "Joey Wheeler", description: "Coração de duelista e muita sorte.", style: "Sorte e guerreiros", imageUrl: joeyWheeler },
  { id: "tea-gardner", name: "Téa Gardner", description: "A amizade é sua maior carta.", style: "Suporte", imageUrl: teaGardner },
  { id: "tristan-taylor", name: "Tristan Taylor", description: "Leal e destemido.", style: "Máquinas", imageUrl: tristanTaylor },
  { id: "mai-valentine", name: "Mai Valentine", description: "Elegante e calculista.", style: "Harpias", imageUrl: maiValentine },
  { id: "pegasus", name: "Maximillion Pegasus", description: "Criador do jogo, dono do Olho do Milênio.", style: "Toons", imageUrl: pegasus },
  { id: "yami-bakura", name: "Yami Bakura", description: "Espírito sombrio do Anel do Milênio.", style: "Ocultismo", imageUrl: yamiBakura },
  { id: "marik-ishtar", name: "Marik Ishtar", description: "Líder dos Ghouls Raros.", style: "Controle", imageUrl: marikIshtar },
  { id: "ishizu-ishtar", name: "Ishizu Ishtar", description: "Guardiã que enxerga o futuro.", style: "Cemitério", imageUrl: ishizuIshtar },
  { id: "rex-raptor", name: "Rex Raptor", description: "Especialista em dinossauros.", style: "Dinossauros", imageUrl: rexRaptor },
  { id: "weevil-underwood", name: "Weevil Underwood", description: "Astuto colecionador de insetos.", style: "Insetos", imageUrl: weevilUnderwood },
  { id: "mako-tsunami", name: "Mako Tsunami", description: "Duelista dos mares.", style: "Água", imageUrl: makoTsunami },
  { id: "bandit-keith", name: "Bandit Keith", description: "Campeão americano sem escrúpulos.", style: "Máquinas", imageUrl: banditKeith },
];
