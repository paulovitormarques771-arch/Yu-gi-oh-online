import type { CSSProperties } from "react";
import background from "@/assets/holographic-arena.jpg";

/** Original stadium art surrounds the live field, never bakes cards or HUD into a screenshot. */
export function ArenaBackdrop() {
  return <div aria-hidden="true" className="arena-backdrop">
    <img src={background} alt="" width={1536} height={1024} className="arena-background-image" />
    <div className="arena-backdrop-shade" />
    {[10, 30, 70, 90].map((left) => <span key={left} className="arena-light-beam" style={{ left: `${left}%` }} />)}
    {Array.from({ length: 28 }, (_, i) => <span key={i} className="arena-spark" style={{ left: `${(i * 37) % 100}%`, "--spark-duration": `${10 + i % 8}s`, "--spark-delay": `${-i * .7}s` } as CSSProperties} />)}
  </div>;
}
