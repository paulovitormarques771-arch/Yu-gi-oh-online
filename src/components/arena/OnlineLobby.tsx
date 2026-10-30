import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Link2, Loader2, LogIn } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth-user";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { newRoomCode } from "@/lib/online-room";

export function OnlineLobby() {
  const { data: user } = useAuthUser();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function create() {
    if (!user) return;
    setBusy(true);
    const { data: profile } = await supabase.from("profiles").select("nickname").eq("id", user.id).maybeSingle();
    const id = newRoomCode();
    const { error } = await supabase.from("duel_rooms").insert({ id, host_id: user.id, host_name: profile?.nickname ?? "Anfitrião" });
    setBusy(false);
    if (error) return toast.error("Não foi possível criar a sala.");
    navigate({ to: "/duelo/$roomId", params: { roomId: id } });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      <div className="rounded-xl border border-border bg-card/70 p-8">
        <Link2 className="h-8 w-8 text-primary" />
        <h3 className="mt-2 text-2xl font-bold">Criar sala</h3>
        <p className="mt-1 text-sm text-muted-foreground">Gere um código e um link para enviar ao seu amigo. O duelo começa quando ele entrar.</p>
        <Button onClick={create} disabled={busy} className="mt-6 gap-2 font-display font-bold">{busy && <Loader2 className="animate-spin" />}Criar sala online</Button>
      </div>
      <form className="rounded-xl border border-border bg-card/70 p-8" onSubmit={(e) => { e.preventDefault(); const c = code.trim().toUpperCase(); if (c.length >= 4) navigate({ to: "/duelo/$roomId", params: { roomId: c } }); }}>
        <LogIn className="h-8 w-8 text-gold" />
        <h3 className="mt-2 text-2xl font-bold">Entrar com código</h3>
        <p className="mt-1 text-sm text-muted-foreground">Digite o código de 6 letras que você recebeu.</p>
        <div className="mt-6 flex gap-2">
          <Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={6} placeholder="EX: K7QM2D" className="bg-background font-display uppercase tracking-widest" />
          <Button type="submit" variant="outline">Entrar</Button>
        </div>
      </form>
    </div>
  );
}
