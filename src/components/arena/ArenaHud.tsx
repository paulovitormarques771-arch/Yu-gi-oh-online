import type { PlayerState } from "@/lib/duel-engine";
import { START_LP } from "@/lib/duel-engine";
import { cn } from "@/lib/utils";

export function ArenaHud({ player, avatar, enemy, active }: { player: PlayerState; avatar?: string | undefined; enemy?: boolean; active?: boolean }) {
  return <div className={cn("arena-hud", enemy && "arena-hud-enemy", active && "arena-hud-active")}>
    <div className="arena-avatar">{avatar && <img src={avatar} alt="" width={72} height={72} />}</div>
    <div className="arena-hud-readout">
      <div className="arena-hud-name"><span>{player.name}</span><small>{enemy ? "OPONENTE" : "DUELISTA"}</small></div>
      <div className="arena-lp"><span>LP</span><strong>{player.lp.toLocaleString("pt-BR")}</strong><span className="arena-active-light" /></div>
      <meter min={0} max={START_LP} value={player.lp} aria-label={`Pontos de vida de ${player.name}`} />
    </div>
  </div>;
}