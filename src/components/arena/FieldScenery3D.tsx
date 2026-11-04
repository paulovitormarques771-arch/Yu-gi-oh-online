import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import type { Group, MeshBasicMaterial } from "three";
import type { FieldTheme } from "@/lib/field-spells";

type Colors = { cyan: string; green: string; gold: string; magic: string; surface: string; foreground: string; ink: string; damage: string };
/** Symbolic original terrain stays below zones and around the board, never hiding cards. */
export function FieldScenery3D({ theme, colors: c, reduced }: { theme: FieldTheme; colors: Colors; reduced: boolean }) {
  const animated = useRef<Group>(null);
  const pulse = useRef<MeshBasicMaterial>(null);
  useFrame(({ clock }) => { if (animated.current && !reduced) { animated.current.position.y = 0; animated.current.rotation.y = theme === "orichalcos" ? Math.sin(clock.elapsedTime * .3) * .025 : 0; } if (pulse.current && !reduced) pulse.current.opacity = .35 + (Math.sin(clock.elapsedTime * 2.6) + 1) * .28; });
  const color = theme === "orichalcos" || theme === "forest" || theme === "meadow" ? c.green : theme === "ocean" ? c.cyan : theme === "dark" ? c.magic : c.gold;
  return <group ref={animated}>
    <ambientLight color={color} intensity={theme === "orichalcos" ? 1.1 : .7} />
    {[-3, 3].map((x) => <pointLight key={x} position={[x, 2.4, 0]} color={color} intensity={theme === "orichalcos" ? 9 : 5} distance={9} />)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .006, 0]}><ringGeometry args={[3.9, 4.6, 96]} /><meshBasicMaterial color={color} transparent opacity={.5} toneMapped={false} depthWrite={false} /></mesh>
    {theme === "orichalcos" && [0, 1, 2, 3, 4, 5].map((i) => <mesh key={`p${i}`} position={[Math.cos(i * Math.PI / 3) * 3.5, 1.2, Math.sin(i * Math.PI / 3) * 3.5]}><cylinderGeometry args={[.06, .14, 2.4, 12, 1, true]} /><meshBasicMaterial color={c.green} transparent opacity={.55} toneMapped={false} depthWrite={false} side={2} /></mesh>)}
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, .004, 0]}><planeGeometry args={[8.5, 7.3]} /><meshBasicMaterial color={theme === "orichalcos" || theme === "dark" ? c.ink : color} transparent opacity={theme === "orichalcos" ? .9 : .32} depthWrite={false} /></mesh>
    {theme === "orichalcos" && <group position={[0, .012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh position={[0, 0, .001]}><ringGeometry args={[3.46, 3.56, 96]} /><meshBasicMaterial ref={pulse} color={c.green} transparent opacity={.7} toneMapped={false} /></mesh>
      {[1.4, 2.4, 3.5].map((r) => <mesh key={r}><ringGeometry args={[r, r + .025, 96]} /><meshBasicMaterial color={c.green} toneMapped={false} /></mesh>)}
      {[0, 1, 2, 3, 4, 5].map((i) => <group key={i} rotation={[0, 0, i * Math.PI / 3]}><mesh position={[0, 1.75, 0]} rotation={[0, 0, Math.PI / 3]}><planeGeometry args={[3.5, .03]} /><meshBasicMaterial color={c.green} toneMapped={false} /></mesh><mesh position={[0, 3, 0]}><ringGeometry args={[.09, .13, 3]} /><meshBasicMaterial color={c.foreground} toneMapped={false} /></mesh></group>)}
    </group>}
    {theme === "toon" && <group position={[0, .03, -3.5]}>
      {[-1, 1].map((side) => <group key={side} position={[side * 1.1, 0, 0]} rotation={[0, 0, side * -.08]}><mesh><boxGeometry args={[2.2, .09, .75]} /><meshStandardMaterial color={c.foreground} /></mesh><mesh position={[0, -.07, 0]}><boxGeometry args={[2.3, .04, .8]} /><meshStandardMaterial color={c.magic} /></mesh></group>)}
      <mesh position={[0, .45, -.2]}><boxGeometry args={[.7, .85, .5]} /><meshStandardMaterial color={c.gold} /></mesh>
      {[-1, 1].map((side) => <group key={side} position={[side * .55, .55, -.2]}><mesh><cylinderGeometry args={[.16, .16, 1.1, 12]} /><meshStandardMaterial color={c.cyan} /></mesh><mesh position={[0, .72, 0]}><coneGeometry args={[.3, .4, 12]} /><meshStandardMaterial color={c.damage} /></mesh></group>)}
    </group>}
    {theme === "ocean" && Array.from({ length: 9 }, (_, i) => <mesh key={i} position={[0, .02, -3.1 + i * .78]} rotation={[-Math.PI / 2, 0, 0]} scale={[1, .23, 1]}><torusGeometry args={[3.6, .025, 6, 64, Math.PI]} /><meshBasicMaterial color={c.cyan} transparent opacity={.35} toneMapped={false} /></mesh>)}
    {theme === "dark" && [-1, 1].map((side) => <group key={side} position={[side * 4, 0, -3.3]}><mesh position={[0, .7, 0]}><boxGeometry args={[.3, 1.4, .4]} /><meshStandardMaterial color={c.surface} metalness={.5} /></mesh><mesh position={[0, 1.48, 0]}><octahedronGeometry args={[.22]} /><meshBasicMaterial color={c.magic} toneMapped={false} /></mesh><pointLight position={[0, 1, 0]} color={c.magic} intensity={2} distance={5} /></group>)}
    {(theme === "mountain" || theme === "waste") && [-1, 1].flatMap((side) => [0, 1, 2, 3].map((i) => <mesh key={`${side}-${i}`} position={[side * (3.6 + (i % 2) * .35), theme === "mountain" ? .25 : .1, -3.4 + i * 2]} rotation={[0, i, .1]} scale={[.55, theme === "mountain" ? 1.1 : .45, .5]}><coneGeometry args={[.6, 1, 5]} /><meshStandardMaterial color={i % 2 ? c.foreground : c.gold} roughness={.9} /></mesh>))}
    {(theme === "forest" || theme === "meadow") && [-1, 1].flatMap((side) => [0, 1, 2, 3, 4].map((i) => <group key={`${side}-${i}`} position={[side * 4.02, .07, -3.1 + i * 1.4]}>
      {theme === "forest" ? <><mesh position={[0, .18, 0]}><cylinderGeometry args={[.035, .06, .4, 8]} /><meshStandardMaterial color={c.gold} /></mesh><mesh position={[0, .55, 0]}><coneGeometry args={[.24, .7, 12]} /><meshStandardMaterial color={c.green} /></mesh></> : <>{[0, 1, 2].map((n) => <mesh key={n} position={[(n - 1) * .08, .12, 0]} rotation={[0, 0, (n - 1) * .25]}><coneGeometry args={[.03, .25, 4]} /><meshStandardMaterial color={c.green} /></mesh>)}<mesh position={[0, .22, .12]}><sphereGeometry args={[.04, 10, 8]} /><meshBasicMaterial color={c.gold} /></mesh></>}
    </group>))}
  </group>;
}