import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { ArenaBackdrop } from "@/components/arena/ArenaBackdrop";
import type { DuelState, PlayerId } from "@/lib/duel-engine";
import type { CardData } from "@/data/catalog";
import { DuelSetup, type DuelSelection } from "@/components/arena/DuelSetup";
import { deckFromIds, isPreparation, readyPreparation, type RoomState } from "@/lib/duel-setup";

interface Room { id: string; host_id: string; guest_id: string | null; host_name: string; guest_name: string | null; status: string; state: RoomState | null; updated_at: string }
interface Seat { roomId: string; seat: PlayerId; initial: DuelState; names: [string, string] }

/** Both players confirm decks before the host deals; revision checks avoid lost readiness updates. */
export function OnlineRoom({ roomId, render, createState }: { roomId: string; render: (seat: Seat) => ReactNode; createState: (names: [string, string], decks: [CardData[], CardData[]]) => DuelState }) {
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [room, setRoom] = useState<Room | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const starting = useRef(false);

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

  // Only the host starts, and only after both deck confirmations are stored.
  useEffect(() => {
    if (!room || !isPreparation(room.state) || room.host_id !== userId || !room.guest_id || starting.current) return;
    const [host, guest] = room.state.decks;
    if (!host || !guest) return;
    starting.current = true;
    void (async () => {
      try {
        const state = createState([room.host_name, room.guest_name ?? "Convidado"], [deckFromIds(host), deckFromIds(guest)]);
        const { data, error: err } = await supabase.from("duel_rooms").update({ state: state as unknown as Json, status: "playing" }).eq("id", room.id).eq("updated_at", room.updated_at).select().maybeSingle();
        if (err) throw err;
        if (data) setRoom(data as unknown as Room);
      } catch { toast.error("Não foi possível iniciar o duelo. Confirme seus decks novamente."); }
      finally { starting.current = false; }
    })();
  }, [room, userId, createState]);

  const confirmDeck = async ({ deck }: DuelSelection) => {
    if (!room || !userId || busy) return;
    setBusy(true);
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const { data: latest, error: readError } = await supabase.from("duel_rooms").select("*").eq("id", roomId).single();
        if (readError) throw readError;
        const current = latest as unknown as Room;
        if (current.state && !isPreparation(current.state)) { setRoom(current); return; }
        const state = readyPreparation(current.state, current.host_id === userId ? 0 : 1, deck);
        const { data, error: writeError } = await supabase.from("duel_rooms").update({ state: state as unknown as Json }).eq("id", roomId).eq("updated_at", current.updated_at).select().maybeSingle();
        if (writeError) throw writeError;
        if (data) { setRoom(data as unknown as Room); return; }
      }
      throw new Error("A sala mudou. Confirme seu deck novamente.");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Não foi possível confirmar seu deck."); }
    finally { setBusy(false); }
  };

  if (userId === null) return <Panel><h1 className="text-3xl font-black">Sala {roomId}</h1><p className="text-muted-foreground">Entre na sua conta para aceitar o desafio.</p>
    <Button asChild><Link to="/auth" search={{ redirect: `/duelo/${roomId}` }}>Entrar para duelar</Link></Button></Panel>;
  if (error) return <Panel><h1 className="text-3xl font-black">Sala indisponível</h1><p className="text-muted-foreground">{error}</p><Button asChild variant="outline"><Link to="/jogar">Voltar à Central</Link></Button></Panel>;
  if (!room || userId === undefined) return <Panel><Loader2 className="h-8 w-8 animate-spin text-primary" /></Panel>;
  if (room.state && !isPreparation(room.state)) {
    const seat: PlayerId = room.host_id === userId ? 0 : 1;
    return <>{render({ roomId: room.id, seat, initial: room.state, names: [room.host_name, room.guest_name ?? "Convidado"] })}</>;
  }
  const seat: PlayerId = room.host_id === userId ? 0 : 1;
  if (!isPreparation(room.state) || !room.state.decks[seat]) return <DuelSetup busy={busy} onStart={(selection) => void confirmDeck(selection)} />;
  const link = `${window.location.origin}/duelo/${room.id}`;
  const copy = (text: string) => navigator.clipboard.writeText(text).then(() => toast.success("Copiado!"));
  return <Panel>
    <p className="font-display text-xs tracking-[0.4em] text-primary">SALA ONLINE</p>
    <h1 className="font-display text-5xl font-black tracking-[0.3em] text-gold">{room.id}</h1>
    <p className="text-muted-foreground">{room.guest_id ? "Deck confirmado. Aguardando o outro duelista escolher seu deck…" : "Deck confirmado. Aguardando o oponente entrar:"}</p>
    <div className="flex w-full max-w-md items-center gap-2 rounded-md border border-border bg-background/70 p-2 text-left text-sm"><span className="min-w-0 flex-1 truncate">{link}</span>
      <Button size="sm" variant="outline" onClick={() => copy(link)}><Copy />Link</Button><Button size="sm" variant="outline" onClick={() => copy(room.id)}><Copy />Código</Button></div>
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <Button asChild variant="ghost"><Link to="/jogar">Cancelar</Link></Button>
  </Panel>;
}

function Panel({ children }: { children: ReactNode }) {
  return <div className="duel-screen"><ArenaBackdrop /><div className="relative z-10 mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center gap-5 px-4 text-center">{children}</div></div>;
}
