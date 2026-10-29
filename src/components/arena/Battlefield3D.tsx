import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { CanvasTexture, SRGBColorSpace, type Points, type MeshBasicMaterial, type Group, type Matrix4 } from "three";
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
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
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
    const distance = aspect < 1.05 ? 1.34 : .78;
    camera.position.set(0, 10.7 * distance, 8.9 * distance);
    camera.lookAt(0, 0, 0.1);
    camera.updateProjectionMatrix();
  }, [camera, size]);
  return null;
}

function Frame({ x, z, color }: { x: number; z: number; color: string }) {
  const corners = useMemo(() => new Float32Array([-.51, .01, -.69, .51, .01, -.69, .51, .01, .69, -.51, .01, .69]), []);
  return <group position={[x, 0.025, z]}>
    <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[1.02, 1.38]} /><meshBasicMaterial color={color} transparent opacity={0.045} /></mesh>
    <lineLoop><bufferGeometry><bufferAttribute attach="attributes-position" args={[corners, 3]} /></bufferGeometry><lineBasicMaterial color={color} toneMapped={false} /></lineLoop>
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
      const values = ref.current.geometry.attributes["position"];
      if (values) {
        for (let i = 0; i < values.count; i++) values.setY(i, values.getY(i) > 2.5 ? .1 : values.getY(i) + dt * .18);
        values.needsUpdate = true;
      }
    }
    if (pulse.current) pulse.current.opacity = .55 + Math.sin(performance.now() * .0014) * .2;
  });
  return <>
    <points ref={ref}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><pointsMaterial color={colors.cyan} size={.035} transparent opacity={.65} depthWrite={false} /></points>
    <mesh position={[0, .04, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.38, .40, 48]} /><meshBasicMaterial ref={pulse} color={colors.gold} transparent opacity={.6} /></mesh>
  </>;
}

function DeckStack({ x, z }: { x: number; z: number }) {
  const c = useArenaColors();
  return <group position={[x, 0, z]}>
    <mesh position={[0, .10, 0]}><boxGeometry args={[.91, .20, 1.28]} /><meshStandardMaterial color={c.edge} metalness={.6} roughness={.5} /></mesh>
    {[.055, .095, .135, .175].map((y) => <mesh key={y} position={[0, y, 0]}><boxGeometry args={[.92, .007, 1.29]} /><meshBasicMaterial color={c.gold} transparent opacity={.6} /></mesh>)}
  </group>;
}

type Panel = { id: string; x: number; y: number; z: number; content: React.ReactNode };
type PanelRefs = RefObject<Map<string, HTMLDivElement>>;

function panels(p: BattlefieldProps): Panel[] {
  const result: Panel[] = [];
  const rows = [
    { zones: p.opponent.spells, z: -2.5, enemy: true, spell: true },
    { zones: p.opponent.monsters, z: -1.02, enemy: true, spell: false },
    { zones: p.me.monsters, z: 1.02, enemy: false, spell: false },
    { zones: p.me.spells, z: 2.5, enemy: false, spell: true },
  ];
  rows.forEach((row, ri) => row.zones.forEach((zone, i) => {
    if (!zone) return;
    const hidden = row.enemy && zone.faceDown;
    const shown = hidden ? null : zone.card;
    const selected = p.selected === zone.uid || p.tributes?.includes(zone.uid) || p.target === zone.uid;
    result.push({ id: `zone-${ri}-${i}`, x: (i - 2) * 1.17, y: .06, z: row.z,
      content: <ArenaCard card={shown} hidden={hidden} defensive={"position" in zone && zone.position === "def"} faceDown={!row.enemy && zone.faceDown} selected={selected}
        onClick={() => row.enemy ? (row.spell ? shown && p.onInspect?.(shown, true) : p.onOpponentCard?.(zone.uid, shown)) : row.spell ? p.onInspect?.(zone.card, false) : p.onOwnCard?.(zone.uid, zone.card)} /> });
  }));
  [{x: -3.7, z: -2.5, player: p.opponent, enemy: true}, {x: 3.7, z: 2.5, player: p.me, enemy: false}].forEach((deck) => {
    result.push({ id: `deck-${deck.enemy}`, x: deck.x, y: .213, z: deck.z, content: <div>
      <ArenaCard hidden card={null} label={`${deck.enemy ? "Baralho adversário" : "Seu baralho"}: ${deck.player.deck.length} cartas`} onClick={!deck.enemy && p.canDraw ? p.onDraw : undefined} className="arena-deck-top" />
      <span className="arena-deck-count">BARALHO <b>{deck.player.deck.length}</b></span>
    </div> });
  });
  [{x: 3.7, z: -1.8, cards: p.opponent.graveyard, enemy: true}, {x: -3.7, z: 1.8, cards: p.me.graveyard, enemy: false}].forEach((g) => {
    const last = g.cards[g.cards.length - 1];
    result.push({ id: `grave-${g.enemy}`, x: g.x, y: .05, z: g.z,
      content: last ? <ArenaCard card={last} onClick={() => p.onInspect?.(last, g.enemy)} /> : <div className="arena-grave-mark"><span>◇</span><small>CEMITÉRIO</small></div> });
  });
  return result;
}

/** DOM controls stay in the main React root; only projection matrices are updated per frame. */
function ProjectPanel({ panel, refs }: { panel: Panel; refs: PanelRefs }) {
  const group = useRef<Group>(null);
  const cameraMultipliers = [1,-1,1,1,1,-1,1,1,1,-1,1,1,1,-1,1,1];
  const objectMultipliers = [.01,.01,.01,1,-.01,-.01,-.01,-1,.01,.01,.01,1,1,1,1,1];
  const matrixCSS = (matrix: Matrix4, multipliers: number[]) => `matrix3d(${matrix.elements.map((n, i) => n * (multipliers[i] ?? 1)).join(",")})`;
  useFrame(({camera, size}) => {
    const outer = refs.current.get(panel.id);
    const cameraEl = outer?.firstElementChild;
    const objectEl = cameraEl?.firstElementChild;
    if (!outer || !(cameraEl instanceof HTMLElement) || !(objectEl instanceof HTMLElement) || !group.current) return;
    camera.updateMatrixWorld(); group.current.updateWorldMatrix(true, false);
    const fov = (camera.projectionMatrix.elements[5] ?? 1) * size.height / 2;
    outer.style.width = `${size.width}px`; outer.style.height = `${size.height}px`; outer.style.perspective = `${fov}px`;
    cameraEl.style.transform = `translateZ(${fov}px)${matrixCSS(camera.matrixWorldInverse,cameraMultipliers)}translate(${size.width/2}px,${size.height/2}px)`;
    objectEl.style.transform = `translate(-50%,-50%)${matrixCSS(group.current.matrixWorld,objectMultipliers)}`;
  });
  return <group ref={group} position={[panel.x,panel.y,panel.z]} rotation={[-Math.PI/2,0,0]} />;
}

function Scene({ onReady, reduced, panelList, panelRefs, ...p }: BattlefieldProps & { onReady: () => void; reduced: boolean; panelList: Panel[]; panelRefs: PanelRefs }) {
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
      return <Frame key={`${ri}-${i}`} x={x} z={row.z} color={row.spell ? colors.green : colors.cyan} />;
    }))}
    <DeckStack x={-3.7} z={-2.5} />
    <DeckStack x={3.7} z={2.5} />
    <Frame x={3.7} z={-1.8} color={colors.magic} />
    <Frame x={-3.7} z={1.8} color={colors.magic} />
    {panelList.map((panel) => <ProjectPanel key={panel.id} panel={panel} refs={panelRefs} />)}
    <Energy reduced={reduced} onReady={onReady} />
  </>;
}

export function Battlefield3D(p: BattlefieldProps) {
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(false);
  const panelRefs = useRef(new Map<string, HTMLDivElement>());
  const panelList = panels(p);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches); update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  return <div className={cn("battlefield-scene", p.preview && "battlefield-preview")} data-scene-ready={ready ? "1" : undefined}>
    <Canvas camera={{ fov: 40, near: .1, far: 60 }} dpr={[1, 1.5]} frameloop={reduced ? "demand" : "always"} gl={{ alpha: true, antialias: true }}>
      <Scene {...p} reduced={reduced} panelList={panelList} panelRefs={panelRefs} onReady={() => setReady(true)} />
    </Canvas>
    {panelList.map((panel) => <div className="arena-projected-panel" key={panel.id} ref={(element) => { if (element) panelRefs.current.set(panel.id, element); else panelRefs.current.delete(panel.id); }}>
      <div className="arena-projected-camera"><div className="arena-projected-object">{panel.content}</div></div>
    </div>)}
    {!ready && <div className="arena-loading"><CardBack /><span>PREPARANDO O CAMPO</span></div>}
    <div className="arena-row-label enemy-label">MONSTROS · OPONENTE</div>
    <div className="arena-row-label own-label">MAGIAS & ARMADILHAS</div>
  </div>;
}