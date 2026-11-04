import { useFrame } from "@react-three/fiber";
import { Suspense, useRef } from "react";
import { SPELL_ART, SpellArt3D } from "@/components/arena/HoloArt3D";
import type { Group } from "three";
import type { SpellEvent } from "@/lib/spell-cinematics";

type Colors = { cyan: string; green: string; gold: string; magic: string; foreground: string; ink: string; damage: string };
export function SpellCinematic3D({ event, viewer, colors: c, reduced }: { event: SpellEvent; viewer: 0 | 1; colors: Colors; reduced: boolean }) {
  const group = useRef<Group>(null), swirl = useRef<Group>(null);
  const start = useRef(performance.now());
  const { kind } = event;
  const own = event.owner === viewer;
  const defensive = ["mirror", "cylinder", "armor", "javelin", "negate"].includes(kind);
  const targetZ = event.targetOwner === undefined ? own === defensive ? 1.02 : -1.02 : event.targetOwner === viewer ? 1.02 : -1.02;
  const x = event.targetIndex === undefined ? 0 : (event.targetIndex - 2) * 1.17;
  const vortex = ["blackhole", "tornado", "negate", "storm", "fusion"].includes(kind);
  const color = ["reborn", "javelin", "swords"].includes(kind) ? c.gold : kind === "fusion" || kind === "negate" || kind === "control" ? c.magic : c.cyan;
  useFrame(() => {
    if (reduced) return;
    const t = (performance.now() - start.current) / 1000;
    if (group.current) group.current.scale.setScalar(Math.min(1, t * 4) * Math.max(.01, Math.min(1, (2.3 - t) * 3)));
    if (swirl.current) { swirl.current.rotation.y = t * (kind === "blackhole" ? -7 : 5); swirl.current.position.y = Math.sin(t * 5) * .08; }
  });
  return <group ref={group} position={[x, .12, ["blackhole", "storm", "fusion", "search"].includes(kind) ? 0 : targetZ]}>
    <pointLight position={[0, 2, 0]} color={color} intensity={3} distance={7} />
    {SPELL_ART[event.card.id] && <Suspense fallback={null}><SpellArt3D art={SPELL_ART[event.card.id]!} reduced={reduced} /></Suspense>}
    {vortex && <group ref={swirl}>
      {Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[0, i * .18, 0]} rotation={[-Math.PI / 2 + .12, .1, i * .5]}><torusGeometry args={[.3 + i * .2, .035, 8, 64, Math.PI * 1.75]} /><meshBasicMaterial color={i % 2 ? color : c.foreground} transparent opacity={.65} toneMapped={false} /></mesh>)}
      {kind === "blackhole" && <mesh rotation={[-Math.PI / 2, 0, 0]}><circleGeometry args={[1.45, 64]} /><meshBasicMaterial color={c.ink} /></mesh>}
      {kind === "fusion" && [-1, 1].map((side) => <mesh key={side} position={[side * 1.5, .6, 0]} rotation={[0, side * .7, .2]}><boxGeometry args={[.55, .8, .03]} /><meshBasicMaterial color={side < 0 ? c.gold : c.cyan} toneMapped={false} /></mesh>)}
    </group>}
    {kind === "reborn" && <group>
      <mesh position={[0, 1.8, 0]}><torusGeometry args={[.27, .055, 12, 48]} /><meshBasicMaterial color={c.gold} toneMapped={false} /></mesh>
      <mesh position={[0, 1.23, 0]}><boxGeometry args={[.09, .75, .09]} /><meshBasicMaterial color={c.gold} toneMapped={false} /></mesh>
      <mesh position={[0, 1.43, 0]}><boxGeometry args={[.68, .09, .09]} /><meshBasicMaterial color={c.gold} toneMapped={false} /></mesh>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[.3, .65, 2, 32, 1, true]} /><meshBasicMaterial color={c.gold} transparent opacity={.16} depthWrite={false} side={2} toneMapped={false} /></mesh>
    </group>}
    {kind === "lightning" && Array.from({ length: 5 }, (_, i) => <group key={i} position={[(i - 2) * 1.17, 0, 0]}>
      {[0, 1, 2, 3].map((j) => <mesh key={j} position={[Math.sin(j * 3 + i) * .14, .45 + j * .6, 0]} rotation={[0, 0, j % 2 ? -.3 : .3]}><boxGeometry args={[.045, .75, .05]} /><meshBasicMaterial color={j % 2 ? c.foreground : c.cyan} toneMapped={false} /></mesh>)}
    </group>)}
    {["mirror", "armor"].includes(kind) && <group>
      <mesh position={[0, .8, .1]}><circleGeometry args={[1.05, kind === "armor" ? 6 : 32]} /><meshStandardMaterial color={c.foreground} metalness={1} roughness={.05} transparent opacity={.85} side={2} /></mesh>
      <mesh position={[0, .8, .13]}><ringGeometry args={[.99, 1.06, 32]} /><meshBasicMaterial color={color} toneMapped={false} side={2} /></mesh>
      {kind === "armor" && [-1, 1].map((s) => <mesh key={s} position={[s * .4, .8, .16]} rotation={[0, 0, s * .7]}><planeGeometry args={[.03, 1.6]} /><meshBasicMaterial color={c.damage} toneMapped={false} /></mesh>)}
    </group>}
    {kind === "cylinder" && [-1, 1].map((side) => <group key={side} position={[side * .65, .7, 0]} rotation={[Math.PI / 2, 0, 0]}>
      <mesh><cylinderGeometry args={[.25, .25, 1.1, 24, 1, true]} /><meshStandardMaterial color={side < 0 ? c.magic : c.damage} metalness={.8} roughness={.2} side={2} /></mesh>
      <mesh position={[0, .56, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.21, .29, 32]} /><meshBasicMaterial color={c.gold} toneMapped={false} /></mesh>
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[.07, .15, .9, 12]} /><meshBasicMaterial color={color} transparent opacity={.85} toneMapped={false} /></mesh>
    </group>)}
    {["swords", "javelin"].includes(kind) && Array.from({ length: kind === "swords" ? 5 : 1 }, (_, i) => <group key={i} position={[(i - (kind === "swords" ? 2 : 0)) * 1.17, .7, 0]} rotation={[0, 0, kind === "javelin" ? -.6 : 0]}>
      <mesh><boxGeometry args={[.06, 1.4, .04]} /><meshBasicMaterial color={c.gold} toneMapped={false} /></mesh>
      <mesh position={[0, .6, 0]}><boxGeometry args={[.4, .05, .07]} /><meshBasicMaterial color={c.foreground} toneMapped={false} /></mesh>
      <mesh position={[0, .8, 0]}><cylinderGeometry args={[.025, .035, .25, 8]} /><meshBasicMaterial color={c.gold} /></mesh>
    </group>)}
    {kind === "control" && <group>
      <mesh position={[0, 1.5, 0]}><sphereGeometry args={[.2, 24, 16]} /><meshBasicMaterial color={c.magic} transparent opacity={.8} /></mesh>
      <mesh position={[0, .8, 0]}><coneGeometry args={[.6, 1.3, 32, 1, true]} /><meshBasicMaterial color={c.magic} transparent opacity={.35} side={2} /></mesh>
      <mesh position={[0, .05, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.65, .7, 48]} /><meshBasicMaterial color={c.magic} toneMapped={false} /></mesh>
    </group>}
    {kind === "search" && <group ref={swirl}>{[-1, 0, 1].map((i) => <mesh key={i} position={[i * .7, 1, 0]} rotation={[0, i * .3, 0]}><boxGeometry args={[.5, .72, .03]} /><meshBasicMaterial color={i === 0 ? c.green : c.cyan} wireframe toneMapped={false} /></mesh>)}</group>}
  </group>;
}