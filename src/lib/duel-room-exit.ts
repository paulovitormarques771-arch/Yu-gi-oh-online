import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import type { PlayerId } from "@/lib/duel-engine";
import { roomExitState, type RoomState } from "@/lib/duel-setup";

/** Persist exit before navigation; retry if the other player moved simultaneously. */
export async function leaveOnlineRoom(roomId: string, seat: PlayerId) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data: room, error: readError } = await supabase.from("duel_rooms").select("state, updated_at").eq("id", roomId).single();
    if (readError) throw readError;
    const update = roomExitState(room.state as unknown as RoomState | null, seat);
    const { data, error } = await supabase.from("duel_rooms").update({ status: update.status, state: update.state as unknown as Json }).eq("id", roomId).eq("updated_at", room.updated_at).select("id").maybeSingle();
    if (error) throw error;
    if (data) return;
  }
  throw new Error("A sala mudou. Tente desistir novamente.");
}