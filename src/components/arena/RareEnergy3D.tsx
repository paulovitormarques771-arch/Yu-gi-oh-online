import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { type Group } from "three";
import type { CardData } from "@/data/catalog";

type EnergyColors = { cyan: string; gold: string; magic: string; foreground: string };

/** Original procedural holograms, keyed to the card's monster family; no external models. */
function MonsterHologram({ card, colors }: { card: CardData; colors: EnergyColors }) {
  const dragon = /dragon|dragão/i.test(card.race ?? "") || [89631139, 74677422, 10000020, 10000010].includes(card.id);
  const divine = card.attribute === "DIVINE";
  const color = divine ? colors.gold : dragon ? colors.cyan : colors.magic;
  return <group scale={divine ? 1.2 : 1}>
    <mesh position={[0, .55, 0]}><coneGeometry args={[.22, .9, dragon ? 6 : 12]} /><meshBasicMaterial color={color} wireframe transparent opacity={.85} toneMapped={false} /></mesh>
    <mesh position={[0, 1.15, 0]} rotation={[0, 0, dragon ? -.3 : 0]}><octahedronGeometry args={[.24]} /><meshBasicMaterial color={color} wireframe toneMapped={false} /></mesh>
    {dragon ? <>
      {[-1, 1].map((side) => <group key={side} position={[side * .42, .7, 0]} rotation={[.15, 0, side * -.85]}>
        <mesh><coneGeometry args={[.42, 1.05, 3]} /><meshBasicMaterial color={color} transparent opacity={.3} side={2} toneMapped={false} /></mesh>
        <mesh><coneGeometry args={[.42, 1.05, 3]} /><meshBasicMaterial color={color} wireframe toneMapped={false} /></mesh>
      </group>)}
      <mesh position={[0, .28, -.45]} rotation={[1.1, 0, 0]}><coneGeometry args={[.12, 1, 5]} /><meshBasicMaterial color={color} wireframe toneMapped={false} /></mesh>
      <mesh position={[0, 1.4, 0]}><coneGeometry args={[.12, .35, 4]} /><meshBasicMaterial color={colors.gold} wireframe /></mesh>
    </> : <>
      <mesh position={[0, 1.48, 0]}><coneGeometry args={[.3, .5, 8]} /><meshBasicMaterial color={color} wireframe toneMapped={false} /></mesh>
      <mesh position={[.4, .72, 0]}><cylinderGeometry args={[.02, .02, 1.5, 6]} /><meshBasicMaterial color={colors.gold} toneMapped={false} /></mesh>
      <mesh position={[.4, 1.5, 0]}><octahedronGeometry args={[.13]} /><meshBasicMaterial color={colors.gold} wireframe toneMapped={false} /></mesh>
    </>}
  </group>;
}

export function RareEnergy3D({ x, z, colors, card, reduced, burst = false, attack = false }: {
  x: number; z: number; colors: EnergyColors; card: CardData; reduced: boolean; burst?: boolean; attack?: boolean;
}) {
  const group = useRef<Group>(null);
  const ring = useRef<Group>(null);
  const start = useRef(performance.now());
  const bolts = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const angle = i * Math.PI / 3;
    return new Float32Array([Math.cos(angle) * .6, .05, Math.sin(angle) * .6, Math.cos(angle) * .42, .75, Math.sin(angle) * .42, Math.cos(angle) * .7, 1.1, Math.sin(angle) * .7, Math.cos(angle) * .35, 1.8, Math.sin(angle) * .35, Math.cos(angle) * .48, 2.3, Math.sin(angle) * .48]);
  }), []);
  useFrame((_, delta) => {
    if (reduced) return;
    const elapsed = (performance.now() - start.current) / 1000;
    if (ring.current) ring.current.rotation.y += Math.min(delta, .05) * .9;
    if (group.current) {
      group.current.position.y = .08 + Math.sin(elapsed * 3) * .025;
      if (attack) { group.current.rotation.y = Math.sin(elapsed * 2) * .3; group.current.scale.setScalar(.85 + Math.sin(Math.min(elapsed, 1.6) / 1.6 * Math.PI) * .4); }
    }
  });
  return <group ref={group} position={[x, .08, z]}>
    <group ref={ring}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.71, .75, 48]} /><meshBasicMaterial color={colors.gold} transparent opacity={.7} toneMapped={false} /></mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.83, .85, 6]} /><meshBasicMaterial color={colors.magic} transparent opacity={.7} toneMapped={false} /></mesh>
    </group>
    {(burst || attack) && <>
      {bolts.map((positions, i) => <line key={i}><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions, 3]} /></bufferGeometry><lineBasicMaterial color={i % 2 ? colors.gold : colors.cyan} transparent opacity={reduced ? .35 : .85} toneMapped={false} /></line>)}
      <mesh position={[0, 1, 0]}><cylinderGeometry args={[.5, .25, 2, 12, 1, true]} /><meshBasicMaterial color={colors.gold} transparent opacity={.08} depthWrite={false} side={2} toneMapped={false} /></mesh>
    </>}
    {(attack || burst) && <MonsterHologram card={card} colors={colors} />}
  </group>;
}