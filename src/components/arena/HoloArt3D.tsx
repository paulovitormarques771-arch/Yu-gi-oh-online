import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { useEffect, useMemo, useRef } from "react";
import { AdditiveBlending, DoubleSide, NormalBlending, SRGBColorSpace, PlaneGeometry, type Group, type MeshBasicMaterial } from "three";
import obelisk from "@/assets/holograms/obelisk-relief.png.asset.json";
import slifer from "@/assets/holograms/slifer-relief.png.asset.json";
import blueEyes from "@/assets/holograms/blue-eyes-relief.png.asset.json";
import darkMagician from "@/assets/holograms/dark-magician-solid.png.asset.json";
import raigeki from "@/assets/holograms/raigeki.png.asset.json";
import darkHole from "@/assets/holograms/dark-hole.jpg.asset.json";

/** User-supplied illustrated holograms keyed by card id; width/height are world units. */
export const HOLO_ART: Record<number, { url: string; w: number; h: number }> = {
  10000000: { url: obelisk.url, w: 1.8, h: 1.84 },
  10000020: { url: slifer.url, w: 2.8, h: 1.61 },
  89631139: { url: blueEyes.url, w: 2.8, h: 1.53 },
  46986414: { url: darkMagician.url, w: 1.34, h: 1.9 },
};
export const SPELL_ART: Record<number, { url: string; w: number; h: number; additive?: boolean }> = {
  12580477: { url: raigeki.url, w: 7, h: 3.8, additive: true },
  53129443: { url: darkHole.url, w: 7.5, h: 4.1 },
};

/** Textured relief: geometric depth and opaque front, using the supplied illustration. */
export function HoloArt3D({ art, color, reduced, attacking = false }: { art: { url: string; w: number; h: number }; color: string; reduced: boolean; attacking?: boolean }) {
  const tex = useTexture(art.url);
  tex.colorSpace = SRGBColorSpace; tex.anisotropy = 8;
  const g = useRef<Group>(null);
  const relief = useMemo(() => {
    const geometry = new PlaneGeometry(art.w, art.h, 72, 56);
    const positions = geometry.attributes['position'];
    const uv = geometry.attributes['uv'];
    if (positions && uv) {
      const canvas = document.createElement('canvas'); canvas.width = 128; canvas.height = 128;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      let pixels: Uint8ClampedArray | undefined;
      if (ctx && tex.image) { ctx.drawImage(tex.image as CanvasImageSource, 0, 0, 128, 128); pixels = ctx.getImageData(0, 0, 128, 128).data; }
      for (let i = 0; i < positions.count; i++) {
        const u = uv.getX(i), v = uv.getY(i);
        const pixel = (Math.min(127, Math.floor((1-v)*128))*128 + Math.min(127, Math.floor(u*128))) * 4;
        const luminance = pixels ? ((pixels[pixel] ?? 0) + (pixels[pixel+1] ?? 0) + (pixels[pixel+2] ?? 0)) / 765 : .5;
        const volume = Math.sin(u*Math.PI)*Math.sin(v*Math.PI);
        positions.setZ(i, volume * .2 + luminance * .06);
      }
      positions.needsUpdate = true; geometry.computeVertexNormals();
    }
    return geometry;
  }, [art.w, art.h, tex]);
  useEffect(() => () => relief.dispose(), [relief]);
  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;
    if (g.current) {
      g.current.quaternion.copy(camera.quaternion);
      if (!reduced) {
        g.current.rotateY(Math.sin(t * 1.3) * (attacking ? .15 : .065));
        g.current.position.y = art.h / 2 + .64 + Math.sin(t * 1.6) * .035;
        g.current.rotation.z += attacking ? Math.sin(t * 8) * .04 : Math.sin(t * 1.2) * .012;
      }
    }
  });
  return <group>
    <mesh position={[0, .03, 0]} rotation={[-Math.PI / 2, 0, 0]}><ringGeometry args={[.38, .41, 48]} /><meshBasicMaterial color={color} toneMapped={false} transparent opacity={.6} /></mesh>
    <group ref={g} position={[0, art.h / 2 + .64, 0]}>
      {[-.06, -.03].map(z => <mesh key={z} geometry={relief} position={[0, 0, z]}><meshStandardMaterial map={tex} color={color} alphaTest={.3} side={DoubleSide} roughness={.65} metalness={.15} /></mesh>)}
      <mesh geometry={relief}><meshStandardMaterial map={tex} emissiveMap={tex} emissiveIntensity={.22} alphaTest={.12} roughness={.6} metalness={.08} side={DoubleSide} /></mesh>
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
    if (mat.current && !reduced) mat.current.opacity = Math.max(0, Math.min(1, t * 3, (2.4 - t) * 2)) * (art.additive ? (.85 + Math.sin(t * 38) * .15) : .92);
  });
  return <group ref={g} position={[0, 2.2, 0]}>
    <mesh><planeGeometry args={[art.w, art.h]} /><meshBasicMaterial ref={mat} map={tex} transparent opacity={.9} depthWrite={false} depthTest={false} toneMapped={false} blending={art.additive ? AdditiveBlending : NormalBlending} /></mesh>
  </group>;
}
