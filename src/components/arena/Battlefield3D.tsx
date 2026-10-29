import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Html, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState } from "react";
import { CanvasTexture, SRGBColorSpace, type Points, type MeshBasicMaterial } from "three";
import { ArenaCard, CardBack } from "@/components/arena/ArenaCard";
import type { CardData } from "@/data/catalog";
import type { PlayerState } from "@/lib/duel-engine";
import { cn } from "@/lib/utils";

export type BattlefieldProps = {
  me: PlayerState; opponent: PlayerState; selected?: string | null; tributes?: string[]; target?: string | null;
  onOwnCard?: (uid: string, card: CardData) => void;
  onOpponentCard?: (uid: string, card: CardData | null) => void;
  onInspect?: (card: CardData, enemy: boolean) => void;
  onDraw?: () => void; canDraw?: boolean; preview?: boolean;
};

function useArenaColors() {
  return useMemo(() => {
    const css = getComputedStyle(document.documentElement);
    const canvas = document.createElement("canvas"); canvas.width = 1; canvas.height = 1;
    const ctx = canvas.getContext("2d");
    const color = (name: string) => {
      const token = css.getPropertyValue(name).trim();
      if (!ctx) return token;
      ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = token; ctx.fillRect(0, 0, 1, 1);
      const rgba = ctx.getImageData(0, 0, 1, 1).data;
      return `rgb(${rgba[0]}, ${rgba[1]}, ${rgba[2]})`;
    };
    return { cyan: color("--arena-cyan"), green: color("--arena-green"), gold: color("--gold"), surface: color("--arena-surface"), edge: color("--arena-edge"), ink: color("--background"), foreground: color("--foreground"), magic: color("--magic") };
  }, []);
}

function CameraRig() {
  const { camera, size } = useThree();
  useEffect(() => {
    const aspect = size.width / size.height;
    const distance = aspect < 1.05 ? 1.28 : 1;
    camera.position.set(0, 10.7 * distance, 8.9 * distance);
    camera.lookAt(0, 0, 0.1);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Frame({ x, z, color }: { x: number; z: number; color: string }) {
  return <group position={[x, 0.025, z]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.02, 1.38]} /><meshBasicMaterial color={color} transparent opacity={0.045} /></mesh>
    {[-1, 1].map((n) => <group key={n}>
      <mesh position={[n * .51, .01, 0]}><boxGeometry args={[.022, .016, 1.4]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
      <mesh position={[0, .01, n * .69]}><boxGeometry args={[1.04, .016, .022]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>
    </group>)}
  </group>;
}

function Energy({ reduced, onReady }: { reduced: boolean; onReady: () => void }) {
  const ref = useRef<Points>(null);
  const pulse = useRef<MeshBasicMaterial>(null);
  const ready = useRef(false);
  const colors = useArenaColors();
  const positions = useMemo(() => {
    const result = new Float32Array(90 * 3);
    for (let i = 0; i < 90; i++) { result[i * 3] = Math.sin(i * 127.1) * 5; result[i * 3 + 1] = .2 + (i % 13) * .16; result[i * 3 + 2] = Math.cos(i * 91.7) * 4.1; }
    return result;
  }, []);
  useFrame((_, delta) => {
    if (!ready.current) { ready.current = true; onReady(); }
    if (reduced) return;
    const dt = Math.min(delta, .05);
    if (ref.current) {
      const values = ref.current.geometry.attributes.position;
      for (let i = 0; i < values.count; i++) values.setY(i, values.getY(i) > 2.5 ? .1 : values.getY(i) + dt * .18);
      values.needsUpdate = true;
    }
    if (pulse.current) pulse.current.opacity = .55 + Math.sin(performance.now() * .0014) * .2;
  });
  return <>
    <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color={colors.cyan} size={.035} transparent opacity={.65} depthWrite={false} /></points>
    <mesh position={[0, .04, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.38, .40, 48]} /><meshBasicMaterial ref={pulse} color={colors.gold} transparent opacity={.6} /></mesh>
  </>;
}

function DeckStack({ x, z, count, enemy, onDraw, canDraw }: { x: number; z: number; count: number; enemy?: boolean; onDraw?: () => void; canDraw?: boolean }) {
  const c = useArenaColors();
  return <group position={[x, 0, z]}>
    <mesh position={[0, .10, 0]}><boxGeometry args={[.91, .20, 1.28]} /><meshStandardMaterial color={c.edge} metalness={.6} roughness={.5} /></mesh>
    {[.055, .095, .135, .175].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[.92, .007, 1.29]} /><meshBasicMaterial color={c.gold} transparent opacity={.6} /></mesh>)}
    <Html transform position={[0, .213, 0]} rotation={[-Math.PI / 2, 0, 0]} distanceFactor={4} zIndexRange={[12, 0]}>
      <ArenaCard hidden card={null} label={`${enemy ? "Baralho adversário" : "Seu baralho"}: ${count} cartas`} onClick={canDraw ? onDraw : undefined} className="arena-deck-top" />
    </Html>
    <Html center position={[0, .08, enemy ? -.95 : .95]} zIndexRange={[12, 0]}><span className="arena-deck-count">BARALHO <b>{count}</b></span></Html>
  </group>;
}

function Scene({ onReady, reduced, ...p }: BattlefieldProps & { onReady: () => void; reduced: boolean }) {
  const colors = useArenaColors();
  const surface = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 256; canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = colors.surface; ctx.fillRect(0, 0, 256, 256);
      ctx.strokeStyle = colors.edge; ctx.lineWidth = .5;
      for (let i = 0; i < 256; i += 16) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, 256); ctx.moveTo(0, i); ctx.lineTo(256, i); ctx.stroke(); }
    }
    const texture = new CanvasTexture(canvas); texture.colorSpace = SRGBColorSpace; return texture;
  }, [colors]);
  useEffect(() => () => surface.dispose(), [surface]);
  const rows = [
    { zones: p.opponent.spells, z: -2.5, enemy: true, spell: true },
    { zones: p.opponent.monsters, z: -1.02, enemy: true, spell: false },
    { zones: p.me.monsters, z: 1.02, enemy: false, spell: false },
    { zones: p.me.spells, z: 2.5, enemy: false, spell: true },
  ];
  return <>
    <CameraRig />
    <ambientLight intensity={.7} /><directionalLight position={[0, 8, 3]} intensity={2} />
    <pointLight position={[-4, 3, -1]} color={colors.cyan} intensity={12} /><pointLight position={[4, 3, 1]} color={colors.green} intensity={12} />
    <Environment resolution={64}><Lightformer intensity={2} position={[0, 5, 0]} scale={[10, 10, 1]} /><Lightformer intensity={1} color={colors.cyan} position={[-5, 1, -1]} rotation-y={Math.PI / 2} scale={[20, 1, 1]} /></Environment>
    <mesh position={[0, -.17, 0]}><boxGeometry args={[8.65, .3, 7.48]} /><meshStandardMaterial color={colors.edge} metalness={.7} roughness={.35} /></mesh>
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -.008, 0]}><planeGeometry args={[8.56, 7.4]} /><meshStandardMaterial map={surface} metalness={.4} roughness={.65} /></mesh>
    {[-1, 1].map((n) => <group key={n}>
      <mesh position={[n * 4.28, .01, 0]}><boxGeometry args={[.035, .025, 7.4]} /><meshBasicMaterial color={n < 0 ? colors.cyan : colors.green} toneMapped={false} /></mesh>
      <mesh position={[0, .01, n * 3.7]}><boxGeometry args={[8.6, .025, .035]} /><meshBasicMaterial color={n < 0 ? colors.cyan : colors.green} toneMapped={false} /></mesh>
    </group>)}
    <mesh position={[0, .02, 0]}><boxGeometry args={[8.55, .025, .024]} /><meshBasicMaterial color={colors.gold} toneMapped={false} /></mesh>
    {rows.map((row, ri) => row.zones.map((zone, i) => {
      const x = (i - 2) * 1.17;
      const hidden = !!zone && row.enemy && zone.faceDown;
      const shown = zone && !hidden ? zone.card : null;
      const defensive = !!zone && "position" in zone && zone.position === "def";
      const selected = !!zone && (p.selected === zone.uid || p.tributes?.includes(zone.uid));
      return <group key={`${ri}-${i}`}>
        <Frame x={x} z={row.z} color={row.spell ? colors.green : colors.cyan} />
        {zone && <Html transform position={[x, .06, row.z]} rotation={[-Math.PI / 2, 0, 0]} distanceFactor={4} zIndexRange={[15, 0]}>
          <ArenaCard card={shown} hidden={hidden} defensive={defensive} faceDown={!row.enemy && zone.faceDown} selected={selected || p.target === zone.uid}
            onClick={() => row.enemy ? (row.spell ? shown && p.onInspect?.(shown, true) : p.onOpponentCard?.(zone.uid, shown)) : row.spell ? p.onInspect?.(zone.card, false) : p.onOwnCard?.(zone.uid, zone.card)} />
        </Html>}
      </group>;
    }))}
    <DeckStack x={-3.7} z={-2.5} count={p.opponent.deck.length} enemy />
    <DeckStack x={3.7} z={2.5} count={p.me.deck.length} onDraw={p.onDraw} canDraw={p.canDraw} />
    {[{ x: 3.7, z: -1.8, cards: p.opponent.graveyard, enemy: true }, { x: -3.7, z: 1.8, cards: p.me.graveyard, enemy: false }].map((g) => {
      const last = g.cards[g.cards.length - 1];
      return <group key={g.x}><Frame x={g.x} z={g.z} color={colors.magic} />
        <Html transform position={[g.x, .05, g.z]} rotation={[-Math.PI / 2, 0, 0]} distanceFactor={4} zIndexRange={[12, 0]}>
          {last ? <ArenaCard card={last} onClick={() => p.onInspect?.(last, g.enemy)} /> : <div className="arena-grave-mark"><span>◇</span><small>CEMITÉRIO</small></div>}
        </Html>
      </group>;
    })}
    <Energy reduced={reduced} onReady={onReady} />
  </>;
}

export function Battlefield3D(p: BattlefieldProps) {
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches); update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <div className={cn("battlefield-scene", p.preview && "battlefield-preview")} data-scene-ready={ready ? "1" : undefined}>
    <Canvas camera={{ fov: 45, near: .1, far: 60 }} dpr={[1, 1.5]} frameloop={reduced ? "demand" : "always"} gl={{ alpha: true, antialias: true }}>
      <Scene {...p} reduced={reduced} onReady={() => setReady(true)} />
    </Canvas>
    {!ready && <div className="arena-loading"><CardBack /><span>PREPARANDO O CAMPO</span></div>}
    <div className="arena-row-label enemy-label">MONSTROS · OPONENTE</div>
    <div className="arena-row-label own-label">MAGIAS & ARMADILHAS</div>
  </div>;
}