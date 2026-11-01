import type { PlayerState } from "@/lib/duel-engine";
import { START_LP } from "@/lib/duel-engine";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export function ArenaHud({ player, avatar, enemy, active, damage, hitId }: { player: PlayerState; avatar?: string | undefined; enemy?: boolean; active?: boolean; damage?: number | undefined; hitId?: number | undefined }) {
  const [displayLP, setDisplayLP] = useState(player.lp);
  const lpRef = useRef(player.lp);
  useEffect(() => {
    const from = lpRef.current, start = performance.now();
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { lpRef.current = player.lp; setDisplayLP(player.lp); return; }
    let frame = 0;
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / 850);
      const value = Math.round(from + (player.lp - from) * (1 - (1 - progress) ** 3));
      lpRef.current = value; setDisplayLP(value);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [player.lp]);
  return <div className={cn("arena-hud", enemy && "arena-hud-enemy", active && "arena-hud-active")}>
    {damage ? <div key={hitId} className="arena-hud-damage" role="status">−{damage}</div> : null}
    <div className="arena-avatar">{avatar && <img src={avatar} alt="" width={72} height={72} />}</div>
    <div className="arena-hud-readout">
      <div className="arena-hud-name"><span>{player.name}</span><small>{enemy ? "OPONENTE" : "DUELISTA"}</small></div>
      <div className="arena-lp"><span>LP</span><strong aria-label={`${player.lp} pontos de vida`}>{displayLP.toLocaleString("pt-BR")}</strong><span className="arena-active-light" /></div>
      <meter min={0} max={START_LP} value={player.lp} aria-label={`Pontos de vida de ${player.name}`} />
    </div>
  </div>;
}