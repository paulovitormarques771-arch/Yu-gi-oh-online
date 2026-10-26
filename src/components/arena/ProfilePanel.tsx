import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut, Save, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CHARACTERS } from "@/data/catalog";
import { useAuthUser } from "@/hooks/use-auth-user";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ProfilePanel() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { data: user } = useAuthUser();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const [nickname, setNickname] = useState("");
  const [favorite, setFavorite] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setNickname(profile.nickname);
      setFavorite(profile.favorite_character ?? "");
    }
  }, [profile]);

  async function save() {
    if (!user) return;
    if (!/^[A-Za-z0-9_]{3,20}$/.test(nickname)) {
      toast.error("O nickname deve ter 3 a 20 caracteres: letras, números e sublinhado.");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nickname, favorite_character: favorite || null })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.code === "23505" ? "Esse nickname já está em uso por outro duelista." : error.message);
      return;
    }
    toast.success("Perfil atualizado!");
    queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  if (isLoading || !profile) {
    return (
      <div className="flex justify-center rounded-xl border border-border bg-card/60 p-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const initials = profile.nickname.slice(0, 2).toUpperCase();

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="rounded-xl border border-border bg-card/70 p-6 text-center">
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-2 border-gold bg-secondary font-display text-3xl font-black text-gold glow-gold">
          {initials}
        </div>
        <h3 className="mt-4 text-2xl font-bold">{profile.nickname}</h3>
        <p className="text-sm text-muted-foreground">{user?.email}</p>
        <p className="mt-2 text-xs uppercase tracking-widest text-muted-foreground">
          Duelista desde {new Date(profile.created_at.replace(" ", "T")).toLocaleDateString("pt-BR")}
        </p>
        <Button variant="outline" onClick={signOut} className="mt-6 w-full gap-2">
          <LogOut className="h-4 w-4" /> Sair da conta
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-card/70 p-6">
        <h3 className="flex items-center gap-2 text-xl font-bold">
          <UserRound className="h-5 w-5 text-primary" /> Editar perfil
        </h3>
        <div className="mt-5 space-y-5">
          <div>
            <label className="mb-1 block text-sm font-semibold">Nickname</label>
            <Input value={nickname} onChange={(e) => setNickname(e.target.value)} maxLength={20} className="max-w-sm bg-background" />
            <p className="mt-1 text-xs text-muted-foreground">3 a 20 caracteres: letras, números e sublinhado. Deve ser único.</p>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold">Personagem favorito</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CHARACTERS.map((ch) => (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setFavorite(ch.id === favorite ? "" : ch.id)}
                  className={`rounded-md border px-3 py-2 text-left text-sm font-semibold transition hover:border-primary ${
                    favorite === ch.id ? "border-gold bg-secondary glow-gold" : "border-border bg-background"
                  }`}
                >
                  {ch.name}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={save} disabled={saving} className="gap-2 bg-gold-gradient font-display font-bold tracking-widest text-gold-foreground glow-gold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            SALVAR
          </Button>
        </div>
      </div>
    </div>
  );
}
