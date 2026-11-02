import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { Vector3, type Group, type Mesh } from "three";
import type { CardData } from "@/data/catalog";
import { HologramMonster3D } from "@/components/arena/HologramMonster3D";
import { attackFrame, rareProfile } from "@/lib/rare-vfx";

type EnergyColors = { cyan: string; gold: string; magic: string; foreground: string; damage: string };

/** Thick, branching bolts rise from the card's edges, rather than a glowing ring. */
function Lightning({ color, reduced, intense }: { color: string; reduced: boolean; intense: boolean }) {
  const group = useRef<Group>(null);
  const time = useRef(0);
  const branches = useMemo(() => Array.from({ length: intense ? 9 : 5 }, (_, i) => {
    const angle = i * 2.399;
    const radius = .42;
    const points = Array.from({ length: 6 }, (_, j) => new Vector3(
      Math.cos(angle) * radius + Math.sin(i * 31 + j * 9) * j * .07,
      j * (intense ? .44 : .25),
      Math.sin(angle) * .57 + Math.cos(i * 17 + j * 4) * j * .07,
    ));
    return points.slice(1).map((to, j) => {
      const from = points[j] ?? new Vector3();
      const direction = to.clone().sub(from);
      return { midpoint: from.clone().add(to).multiplyScalar(.5), length: direction.length(), rotation: new Vector3(0, 1, 0), direction: direction.normalize() };
    });
  }), [intense]);
  useFrame((_, delta) => {
    if (!group.current || reduced) return;
    time.current += Math.min(delta, .05);
    group.current.rotation.y = Math.sin(time.current * 2.5) * .16;
    group.current.scale.y = .85 + Math.sin(time.current * 5) * .15;
  });
  return <group ref={group}>
    {branches.flatMap((segments, i) => segments.map((s, j) => <mesh key={`${i}-${j}`} position={s.midpoint} onUpdate={(m) => m.quaternion.setFromUnitVectors(s.rotation, s.direction)}>
      <cylinderGeometry args={[intense ? .017 : .01, intense ? .017 : .01, s.length, 5]} />
      <meshBasicMaterial color={color} transparent opacity={reduced ? .4 : .82} toneMapped={false} depthWrite={false} />
    </mesh>))}
  </group>;
}

export function RareEnergy3D({ x, z, colors, card, reduced, burst = false, attack = false, direction = -1, targetX = 0, targetZ = -1.02 }: {
  x: number; z: number; colors: EnergyColors; card: CardData; reduced: boolean; burst?: boolean; attack?: boolean; direction?: number; targetX?: number; targetZ?: number;
}) {
  const model = useRef<Group>(null);
  const projectile = useRef<Group>(null);
  const beam = useRef<Mesh>(null);
  const impact = useRef<Group>(null);
  const strike = useRef(0);
  const elapsed = useRef(0);
  const profile = rareProfile(card);
  const color = colors[profile.color];
  const dx = targetX - x, dz = targetZ - z;
  const vectors = useMemo(() => ({ from: new Vector3(), to: new Vector3(), delta: new Vector3(), up: new Vector3(0, 1, 0) }), []);
  useFrame((_, delta) => {
    elapsed.current += Math.min(delta, .05);
    const t = reduced ? .9 : elapsed.current;
    const f = attackFrame(t);
    strike.current = f.strike;
    if (model.current) {
      const emergence = attack || burst ? f.emerge : 1;
      model.current.scale.setScalar((.08 + emergence * .92) * (attack ? 1.25 : 1));
      const travel = profile.strike === "punch" ? f.strike * .8 : profile.model === "dragon" ? f.strike * .2 : 0;
      model.current.position.set(attack ? dx * travel : 0, attack || burst ? -.15 + emergence * .35 : .1, attack ? dz * travel : 0);
      model.current.rotation.y = attack ? Math.atan2(dx, dz) : direction < 0 ? Math.PI : 0;
      model.current.visible = (attack || burst) && (reduced || f.fade > 0);
    }
    if (projectile.current) {
      projectile.current.visible = attack && (reduced || f.projectile) && profile.strike !== "punch";
      projectile.current.position.set(dx * f.strike, 1.65 * (1 - f.strike) + .25, dz * f.strike);
      projectile.current.rotation.y += reduced ? 0 : delta * 4;
    }
    if (beam.current) {
      beam.current.visible = attack && (reduced || f.projectile) && ["breath", "fire", "solar", "thunder"].includes(profile.strike);
      vectors.from.set(0, 1.9, 0);
      vectors.to.set(dx * f.strike, .3 + 1.6 * (1 - f.strike), dz * f.strike);
      vectors.delta.copy(vectors.to).sub(vectors.from);
      beam.current.position.copy(vectors.from).add(vectors.to).multiplyScalar(.5);
      beam.current.scale.y = Math.max(.01, vectors.delta.length());
      beam.current.quaternion.setFromUnitVectors(vectors.up, vectors.delta.normalize());
    }
    if (impact.current) {
      impact.current.visible = attack && (reduced || f.impact);
      impact.current.scale.setScalar(.15 + f.strike * .8);
      impact.current.rotation.y += reduced ? 0 : delta * 2;
    }
  });
  return <group position={[x, .08, z]}>
    <Lightning color={color} reduced={reduced} intense={burst || attack} />
    <group ref={model} visible={attack || burst} rotation={[0, direction < 0 ? Math.PI : 0, 0]}>
      <HologramMonster3D profile={profile} color={color} core={colors.foreground} attacking={attack} reduced={reduced} strike={strike} />
    </group>
    {attack && <>
      <group ref={projectile} visible={false}>
        <mesh><icosahedronGeometry args={[profile.strike === "spell" ? .24 : .18, 1]} /><meshBasicMaterial color={color} transparent opacity={.85} toneMapped={false} /></mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.33, .026, 6, 24]} /><meshBasicMaterial color={colors.foreground} toneMapped={false} /></mesh>
        {profile.strike === "spell" && <mesh rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[.42, .018, 6, 24]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>}
      </group>
      <mesh ref={beam} visible={false}><cylinderGeometry args={[profile.strike === "thunder" ? .035 : .12, .035, 1, 8]} /><meshBasicMaterial color={color} transparent opacity={.8} toneMapped={false} depthWrite={false} /></mesh>
      <group ref={impact} position={[dx, .3, dz]} visible={false}>
        {Array.from({ length: 8 }, (_, i) => <mesh key={i} rotation={[0, i * Math.PI / 4, Math.PI / 3]}><coneGeometry args={[.07, 1.6, 4]} /><meshBasicMaterial color={i % 2 ? color : colors.foreground} transparent opacity={.75} toneMapped={false} /></mesh>)}
        {profile.strike === "punch" && <mesh rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.4, .47, 32]} /><meshBasicMaterial color={color} toneMapped={false} side={2} /></mesh>}
      </group>
    </>}
  </group>;
}
