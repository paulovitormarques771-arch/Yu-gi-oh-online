import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useRef } from "react";
import { AdditiveBlending, DoubleSide, NormalBlending, SRGBColorSpace, type Group, type Mesh, type MeshBasicMaterial } from "three";
import obelisk from "@/assets/holograms/obelisk.png.asset.json";
import slifer from "@/assets/holograms/slifer.png.asset.json";
import blueEyes from "@/assets/holograms/blue-eyes.png.asset.json";
import darkMagician from "@/assets/holograms/dark-magician.png.asset.json";
import raigeki from "@/assets/holograms/raigeki.png.asset.json";
import darkHole from "@/assets/holograms/dark-hole.jpg.asset.json";

/** User-supplied illustrated holograms keyed by card id; width/height are world units. */
export const HOLO_ART: Record<number, { url: string; w: number; h: number }> = {
  10000000: { url: obelisk.url, w: 2.3, h: 2.6 },
  10000020: { url: slifer.url, w: 3.2, h: 1.8 },
  89631139: { url: blueEyes.url, w: 3.1, h: 1.7 },
  46986414: { url: darkMagician.url, w: 1.7, h: 2.4 },
};
export const SPELL_ART: Record<number, { url: string; w: number; h: number; additive?: boolean }> = {
  12580477: { url: raigeki.url, w: 7, h: 3.8, additive: true },
  53129443: { url: darkHole.url, w: 7.5, h: 4.1 },
};

/** Crisp, fully lit illustrated monster rising from the card, with a scanline shimmer and a light pillar. */
export function HoloArt3D({ art, color, reduced, attacking = false }: { art: { url: string; w: number; h: number }; color: string; reduced: boolean; attacking?: boolean }) {
  const tex = useTexture(art.url);
  tex.colorSpace = SRGBColorSpace; tex.anisotropy = 8;
  const g = useRef<Group>(null), glow = useRef<MeshBasicMaterial>(null), pillar = useRef<Mesh>(null);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    if (g.current) {
      g.current.quaternion.copy(camera.quaternion);
      if (!reduced) g.current.position.y = art.h / 2 + .25 + Math.sin(t * 1.6) * .06 + (attacking ? Math.sin(t * 9) * .05 : 0);
    }
    if (glow.current && !reduced) glow.current.opacity = .35 + Math.sin(t * 3) * .15;
    if (pillar.current && !reduced) pillar.current.rotation.y = t * .8;
  });
  return <group>
    <mesh ref={pillar} position={[0, art.h / 2, 0]}><cylinderGeometry args={[.32, .62, art.h + .4, 32, 1, true]} /><meshBasicMaterial color={color} transparent opacity={.14} side={DoubleSide} depthWrite={false} blending={AdditiveBlending} toneMapped={false} /></mesh>
    <group ref={g} position={[0, art.h / 2 + .25, 0]}>
      <mesh scale={1.06} position={[0, 0, -.01]}><planeGeometry args={[art.w, art.h]} /><meshBasicMaterial ref={glow} map={tex} color={color} transparent opacity={.4} blending={AdditiveBlending} depthWrite={false} toneMapped={false} /></mesh>
      <mesh><planeGeometry args={[art.w, art.h]} /><meshBasicMaterial map={tex} transparent alphaTest={.08} depthWrite={false} toneMapped={false} side={DoubleSide} /></mesh>
    </group>
  </group>;
}

/** Full-board illustrated spell overlay (Dark Hole vortex, Raigeki bolts). */
export function SpellArt3D({ art, reduced }: { art: { url: string; w: number; h: number; additive?: boolean }; reduced: boolean }) {
  const tex = useTexture(art.url);
  tex.colorSpace = SRGBColorSpace;
  const g = useRef<Group>(null), mat = useRef<MeshBasicMaterial>(null);
  const start = useRef(performance.now());
  useFrame(({ camera }) => {
    const t = (performance.now() - start.current) / 1000;
    if (g.current) { g.current.quaternion.copy(camera.quaternion); if (!reduced) g.current.scale.setScalar(.8 + Math.min(t, 2.2) * .12); }
    if (mat.current && !reduced) mat.current.opacity = Math.max(0, Math.min(1, t * 3, (2.4 - t) * 2)) * (art.additive ? (.75 + Math.random() * .25) : .92);
  });
  return <group ref={g} position={[0, 2.2, 0]}>
    <mesh><planeGeometry args={[art.w, art.h]} /><meshBasicMaterial ref={mat} map={tex} transparent opacity={.9} depthWrite={false} depthTest={false} toneMapped={false} blending={art.additive ? AdditiveBlending : NormalBlending} /></mesh>
  </group>;
}
