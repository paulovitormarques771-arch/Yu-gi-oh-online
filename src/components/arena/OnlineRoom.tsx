import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { ArenaBackdrop } from "@/components/arena/ArenaBackdrop";
import type { DuelState, PlayerId } from "@/lib/duel-engine";

interface Room { id: string; host_id: string; guest_id: string | null; host_name: string; guest_name: string | null; status: string; state: DuelState | null }
interface Seat { roomId: string; seat: PlayerId; initial: DuelState; names: [string, string] }

/** Waiting room: join by code/link, then the host deals the shared opening state. */
export function OnlineRoom({ roomId, render, createState }: { roomId: string; render: (seat: Seat) => ReactNode; createState: (names: [string, string]) => DuelState }) {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null)); }, []);

  useEffect(() => {
    if (!userId) return;
    let alive = true;
    (async () => {
      const { data: profile } = await supabase.from("profiles").select("nickname").eq("id", userId).maybeSingle();
      const { data, error: err } = await supabase.rpc("join_duel_room", { _room: roomId, _name: profile?.nickname ?? "Convidado" });
      if (!alive) return;
      if (err) setError(err.message); else setRoom(data as unknown as Room);
    })();
    const channel = supabase.channel(`lobby-${roomId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "duel_rooms", filter: `id=eq.${roomId}` }, (p) => setRoom(p.new as Room))
      .subscribe();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [userId, roomId]);

  // Host deals the duel once the guest has joined.
  useEffect(() => {
    if (!room || room.state || room.host_id !== userId || !room.guest_id) return;
    const state = createState([room.host_name, room.guest_name ?? "Convidado"]);
    supabase.from("duel_rooms").update({ state: state as unknown as Json, status: "playing" }).eq("id", room.id).then(({ error: err }) => {
      if (err) toast.error("Não foi possível iniciar o duelo.");
    });
  }, [room, userId, createState]);

  if (userId === null) return <Panel><h1 className="text-3xl font-black">Sala {roomId}</h1><p className="text-muted-foreground">Entre na sua conta para aceitar o desafio.</p>
    <Button asChild><Link to="/auth" search={{ redirect: `/duelo/${roomId}` }}>Entrar para duelar</Link></Button></Panel>;
  if (error) return <Panel><h1 className="text-3xl font-black">Sala indisponível</h1><p className="text-muted-foreground">{error}</p><Button asChild variant="outline"><Link to="/jogar">Voltar à Central</Link></Button></Panel>;
  if (!room || userId === undefined) return <Panel><Loader2 className="h-8 w-8 animate-spin text-primary" /></Panel>;
  if (room.state) {
    const seat: PlayerId = room.host_id === userId ? 0 : 1;
    return <>{render({ roomId: room.id, seat, initial: room.state, names: [room.host_name, room.guest_name ?? "Convidado"] })}</>;
  }
  const link = `${window.location.origin}/duelo/${room.id}`;
  const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success("Copiado!"));
  return <Panel>
    <p className="font-display text-xs tracking-[0.4em] text-primary">SALA ONLINE</p>
    <h1 className="font-display text-5xl font-black tracking-[0.3em] text-gold">{room.id}</h1>
    <p className="text-muted-foreground">{room.guest_id ? "Oponente conectado! Preparando o duelo…" : "Aguardando o oponente entrar. Envie o código ou o link:"}</p>
    <div className="flex w-full max-w-md items-center gap-2 rounded-md border border-border bg-background/70 p-2 text-left text-sm"><span className="min-w-0 flex-1 truncate">{link}</span>
      <Button size="sm" variant="outline" onClick={() => copy(link)}><Copy />Link</Button><Button size="sm" variant="outline" onClick={() => copy(room.id)}><Copy />Código</Button></div>
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <Button asChild variant="ghost"><Link to="/jogar">Cancelar</Link></Button>
  </Panel>;
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="duel-screen"><ArenaBackdrop /><div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-4 text-center">{children}</div></div>;
}
