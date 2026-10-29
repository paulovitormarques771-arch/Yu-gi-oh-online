import { lazy, Suspense, useEffect, useState } from "react";
import { CARDS, CHARACTERS, type CardData } from "@/data/catalog";
import { createDuel } from "@/lib/duel-engine";
import { ArenaBackdrop } from "@/components/arena/ArenaBackdrop";
import { ArenaHud } from "@/components/arena/ArenaHud";
import { CardZoom } from "@/components/arena/CardZoom";

const Field = lazy(() => import("@/components/arena/Battlefield3D").then((m) => ({ default: m.Battlefield3D })));

function previewState() {
  const s = createDuel(["Yugi Muto", "Seto Kaiba"], [CARDS.concat(CARDS, CARDS), CARDS.concat(CARDS, CARDS)], 26);
  const dark = CARDS.find((c) => c.id === 46986414);
  const dragon = CARDS.find((c) => c.id === 89631139);
  const red = CARDS.find((c) => c.id === 74677422);
  const spell = CARDS.find((c) => c.id === 83764718);
  if (dark) s.players[0].monsters[1] = { uid: "preview-dark", card: dark, faceDown: false, position: "atk", attacked: false, summonedTurn: 1 };
  if (red) s.players[0].monsters[3] = { uid: "preview-red", card: red, faceDown: false, position: "atk", attacked: false, summonedTurn: 1 };
  if (dragon) s.players[1].monsters[2] = { uid: "preview-dragon", card: dragon, faceDown: false, position: "atk", attacked: false, summonedTurn: 1 };
  if (spell) s.players[0].spells[3] = { uid: "preview-spell", card: spell, faceDown: true };
  return s;
}

const state = previewState();

export function ArenaPreview() {
  const [mounted, setMounted] = useState(false);
  const [zoom, setZoom] = useState<{ card: CardData; owner: string } | null>(null);
  useEffect(() => setMounted(true), []);
  const inspect = (card: CardData, enemy = false) => setZoom({ card, owner: state.players[enemy ? 1 : 0].name });
  return <div className="arena-preview-shell">
    <ArenaBackdrop />
    <div className="arena-score-row">
      <ArenaHud player={state.players[0]} avatar={CHARACTERS.find((c) => c.id === "yugi-muto")?.imageUrl} active />
      <ArenaHud player={state.players[1]} avatar={CHARACTERS.find((c) => c.id === "seto-kaiba")?.imageUrl} enemy />
    </div>
    {mounted && <Suspense fallback={<div className="battlefield-scene" />}><Field me={state.players[0]} opponent={state.players[1]} preview
      onOwnCard={(_, card) => inspect(card)} onOpponentCard={(_, card) => { if (card) inspect(card, true); }} onInspect={inspect} /></Suspense>}
    <p className="arena-preview-caption">DUEL ARENA · CAMPO HOLOGRÁFICO</p>
    <CardZoom card={zoom?.card ?? null} owner={zoom?.owner} onClose={() => setZoom(null)} />
  </div>;
}