import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { DoubleSide, Shape, type Group } from "three";
import type { RareProfile } from "@/lib/rare-vfx";

type FormProps = { color: string; core: string; attacking: boolean; reduced: boolean; strike: React.MutableRefObject<number> };

function Skin({ color, wire = false }: { color: string; wire?: boolean }) {
  return wire ? <meshBasicMaterial color={color} wireframe transparent opacity={.36} depthWrite={false} toneMapped={false} side={DoubleSide} /> : <meshStandardMaterial color={color} roughness={.35} metalness={.45} emissive={color} emissiveIntensity={.18} side={DoubleSide} />;
}

function Dragon({ color, core, attacking, reduced, strike }: FormProps) {
  const wings = useRef<Group>(null);
  const neck = useRef<Group>(null);
  const shape = useMemo(() => {
    const s = new Shape(); s.moveTo(0, 0); s.lineTo(.45, .9); s.lineTo(1.45, .4); s.lineTo(1.1, .1); s.lineTo(.82, -.22); s.lineTo(.45, -.45); s.lineTo(0, 0); return s;
  }, []);
  useFrame(({ clock }) => {
    if (reduced) return;
    if (wings.current) wings.current.rotation.x = Math.sin(clock.elapsedTime * 4) * .22;
    if (neck.current) neck.current.rotation.x = attacking ? -.2 + strike.current * .4 : Math.sin(clock.elapsedTime * 2) * .04;
  });
  return <group>
    <mesh position={[0, .8, 0]} scale={[.36, .57, .35]}><sphereGeometry args={[1, 32, 24]} /><Skin color={color} /></mesh>
    <mesh position={[0, .8, 0]} scale={[.37, .58, .36]}><sphereGeometry args={[1, 8, 6]} /><Skin color={core} wire /></mesh>
    <group ref={neck} position={[0, 1.15, .1]}>
      <mesh position={[0, .28, .1]} rotation={[.3, 0, 0]}><cylinderGeometry args={[.15, .25, .65, 8]} /><Skin color={color} /></mesh>
      <mesh position={[0, .6, .28]} scale={[.24, .2, .42]}><sphereGeometry args={[1, 8, 6]} /><Skin color={color} /></mesh>
      <mesh position={[0, .48, .53]} rotation={[-.23, 0, 0]}><boxGeometry args={[.28, .09, .35]} /><Skin color={color} /></mesh>
      {[-1, 1].map((side) => <group key={side}>
        <mesh position={[side * .21, .62, .44]}><sphereGeometry args={[.055, 6, 6]} /><Skin color={core} /></mesh>
        <mesh position={[side * .16, .85, .12]} rotation={[0, 0, side * -.3]}><coneGeometry args={[.08, .4, 5]} /><Skin color={core} /></mesh>
        <mesh position={[side * .1, .5, .67]} rotation={[Math.PI, 0, 0]}><coneGeometry args={[.035, .15, 4]} /><Skin color={core} /></mesh>
      </group>)}
    </group>
    <group ref={wings} position={[0, 1.1, -.15]}>
      {[-1, 1].map((side) => <group key={side} scale={[side, 1, 1]} rotation={[0, -.3, .05]}>
        <mesh><shapeGeometry args={[shape]} /><Skin color={color} /></mesh>
        <mesh position={[0, 0, .01]}><shapeGeometry args={[shape]} /><Skin color={core} wire /></mesh>
        {[.2, .5, .8].map((n) => <mesh key={n} position={[.75, n * .15, .02]} rotation={[0, 0, -1.1 + n]}><cylinderGeometry args={[.018, .025, 1.5, 5]} /><Skin color={core} /></mesh>)}
      </group>)}
    </group>
    {[-1, 1].map((side) => <group key={side} position={[side * .28, .42, .05]} rotation={[.25, 0, side * -.22]}>
      <mesh><cylinderGeometry args={[.12, .08, .5, 7]} /><Skin color={color} /></mesh>
      <mesh position={[0, -.27, .17]}><boxGeometry args={[.23, .12, .35]} /><Skin color={color} /></mesh>
      {[-1, 0, 1].map((n) => <mesh key={n} position={[n * .075, -.27, .4]} rotation={[Math.PI / 2, 0, 0]}><coneGeometry args={[.04, .22, 4]} /><Skin color={core} /></mesh>)}
    </group>)}
    {[0, 1, 2, 3].map((i) => <mesh key={i} position={[Math.sin(i * .6) * .2, .4 - i * .06, -.35 - i * .24]} rotation={[-1.3, 0, .15]}><coneGeometry args={[.15 - i * .03, .45, 6]} /><Skin color={color} /></mesh>)}
  </group>;
}

function Humanoid({ color, core, attacking, reduced, strike, colossus, demon }: FormProps & { colossus: boolean; demon: boolean }) {
  const arm = useRef<Group>(null);
  useFrame(() => {
    if (arm.current && !reduced) arm.current.rotation.x = attacking ? -.25 - strike.current * 1.25 : -.15;
  });
  const broad = colossus || demon;
  return <group>
    <mesh position={[0, .86, 0]} scale={[broad ? .46 : .24, .48, .22]}><sphereGeometry args={[1, 10, 8]} /><Skin color={color} /></mesh>
    <mesh position={[0, 1, .02]} scale={[broad ? .47 : .25, .33, .23]}><octahedronGeometry args={[1]} /><Skin color={core} wire /></mesh>
    <mesh position={[0, 1.48, 0]} scale={[.19, .23, .18]}><sphereGeometry args={[1, 8, 8]} /><Skin color={color} /></mesh>
    <mesh position={[0, 1.51, .16]}><boxGeometry args={[.22, .035, .06]} /><Skin color={core} /></mesh>
    {broad ? [-1, 1].map((side) => <mesh key={side} position={[side * .2, 1.74, 0]} rotation={[0, 0, side * -.35]}><coneGeometry args={[.09, .36, 5]} /><Skin color={core} /></mesh>) : <>
      <mesh position={[0, 1.85, -.04]} rotation={[0, 0, -.14]}><coneGeometry args={[.25, .65, 8]} /><Skin color={color} /></mesh>
      <mesh position={[0, 1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.18, .32, 8]} /><Skin color={core} /></mesh>
      <mesh position={[0, .82, -.22]} rotation={[-.22, 0, 0]}><coneGeometry args={[.45, 1.4, 6, 1, true]} /><Skin color={color} /></mesh>
    </>}
    {[-1, 1].map((side) => <group key={side} position={[side * (broad ? .46 : .3), 1.18, 0]}>
      <mesh scale={[broad ? .24 : .12, .18, .19]}><sphereGeometry args={[1, 8, 8]} /><Skin color={core} /></mesh>
      <group ref={side === 1 ? arm : null}>
        <mesh position={[0, -.28, 0]}><cylinderGeometry args={[broad ? .18 : .09, broad ? .15 : .07, .55, 8]} /><Skin color={color} /></mesh>
        <mesh position={[0, -.58, .03]}><boxGeometry args={broad ? [.35, .33, .35] : [.14, .18, .14]} /><Skin color={core} /></mesh>
        {!broad && side === 1 && <group position={[0, -.55, .09]}>
          <mesh><cylinderGeometry args={[.025, .035, 1.6, 8]} /><Skin color={core} /></mesh>
          <mesh position={[0, .87, 0]}><octahedronGeometry args={[.16]} /><Skin color={core} /></mesh>
          <mesh position={[0, .87, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[.2, .02, 6, 16]} /><Skin color={color} /></mesh>
        </group>}
      </group>
    </group>)}
    {[-1, 1].map((side) => <group key={side} position={[side * .17, .25, 0]}>
      <mesh><cylinderGeometry args={[broad ? .14 : .09, .09, .55, 8]} /><Skin color={color} /></mesh>
      <mesh position={[0, -.25, .09]}><boxGeometry args={[.23, .12, .35]} /><Skin color={core} /></mesh>
    </group>)}
    {demon && [-1, 1].map((side) => <mesh key={side} position={[side * .75, 1.05, -.2]} rotation={[0, 0, side * -.7]}><coneGeometry args={[.4, 1.2, 3]} /><Skin color={color} wire /></mesh>)}
  </group>;
}

/** Original articulated silhouettes; no external model or borrowed character artwork. */
export function HologramMonster3D({ profile, color, core, attacking, reduced, strike }: FormProps & { profile: RareProfile }) {
  const props = { color, core, attacking, reduced, strike };
  const identity = profile.signature ?? 0;
  return <group scale={profile.scale}>
    {profile.model === "dragon" ? <Dragon {...props} /> : <Humanoid {...props} colossus={profile.model === "colossus" || profile.model === "machine"} demon={profile.model === "demon"} />}
    {profile.model === "machine" && <group>
      <mesh position={[0, 1.46, .17]}><boxGeometry args={[.34, .14, .12]} /><Skin color={core} /></mesh>
      {[-1, 1].map((side) => <mesh key={side} position={[side * .12, 1.47, .25]}><sphereGeometry args={[.06, 16, 12]} /><meshBasicMaterial color={color} toneMapped={false} /></mesh>)}
      <mesh position={[0, .96, .24]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[identity === 35803249 ? .27 : .18, .04, 12, 32]} /><Skin color={core} /></mesh>
    </group>}
    {Array.from({ length: profile.crest ?? 3 }, (_, i) => <mesh key={i} position={[(i - ((profile.crest ?? 3) - 1) / 2) * .1, 1.75 + (i % 2) * .06, -.07]} rotation={[0, 0, (i % 2 ? 1 : -1) * .2]}><coneGeometry args={[.035, .16 + (identity % 5) * .025, 6]} /><Skin color={core} /></mesh>)}
    <mesh position={[0, .82, -.26]} rotation={[0, 0, (identity % 13) * .1]}><torusGeometry args={[.35 + (identity % 7) * .02, .025, 8, 24]} /><Skin color={core} /></mesh>
  </group>;
}