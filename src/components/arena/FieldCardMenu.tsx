import type { ReactNode } from "react";
import { Shield, Swords } from "lucide-react";
import { ContextMenu, ContextMenuContent, ContextMenuItem, ContextMenuSeparator, ContextMenuTrigger } from "@/components/ui/context-menu";

export type FieldMenuActions = { attack: boolean; toAttack: boolean; toDefense: boolean; onAttack: () => void; onPosition: (position: "atk" | "def") => void };

export function FieldCardMenu({ actions, children }: { actions: FieldMenuActions; children: ReactNode }) {
  return <ContextMenu><ContextMenuTrigger asChild>{children}</ContextMenuTrigger><ContextMenuContent className="arena-context-menu">
    <ContextMenuItem disabled={!actions.attack} onSelect={actions.onAttack}><Swords />Atacar</ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem disabled={!actions.toAttack} onSelect={() => actions.onPosition("atk")}><Swords />Mudar para posição de ataque</ContextMenuItem>
    <ContextMenuItem disabled={!actions.toDefense} onSelect={() => actions.onPosition("def")}><Shield />Mudar para posição de defesa</ContextMenuItem>
  </ContextMenuContent></ContextMenu>;
}