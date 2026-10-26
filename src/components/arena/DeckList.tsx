import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Loader2, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth-user";
import { Button } from "@/components/ui/button";

interface DeckRow {
  id: string;
  name: string;
  is_main: boolean;
  created_at: string;
  deck_cards: { card_id: number; copies: number }[];
}

export function DeckList({ onEdit, onCreate }: { onEdit: (id: string) => void; onCreate: () => void }) {
  const { data: user } = useAuthUser();
  const queryClient = useQueryClient();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: decks, isLoading } = useQuery({
    queryKey: ["decks", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("decks")
        .select("*, deck_cards(card_id, copies)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as DeckRow[];
    },
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["decks", user?.id] });
  }

  async function setMain(deck: DeckRow) {
    setBusy(true);
    await supabase.from("decks").update({ is_main: false }).eq("user_id", user!.id);
    const { error } = await supabase.from("decks").update({ is_main: true }).eq("id", deck.id);
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`"${deck.name}" agora é seu deck principal.`);
    refresh();
  }

  async function duplicate(deck: DeckRow) {
    setBusy(true);
    const { data: copy, error } = await supabase
      .from("decks")
      .insert({ name: `${deck.name} (cópia)`.slice(0, 40), user_id: user!.id })
      .select("id")
      .single();
    if (error || !copy) {
      toast.error(error?.message ?? "Erro ao duplicar.");
      setBusy(false);
      return;
    }
    if (deck.deck_cards.length) {
      await supabase
        .from("deck_cards")
        .insert(deck.deck_cards.map((c) => ({ deck_id: copy.id, card_id: c.card_id, copies: c.copies })));
    }
    setBusy(false);
    toast.success("Deck duplicado!");
    refresh();
  }

  async function remove(deck: DeckRow) {
    setBusy(true);
    const { error } = await supabase.from("decks").delete().eq("id", deck.id);
    setBusy(false);
    setConfirmDelete(null);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deck excluído.");
    refresh();
  }

  if (isLoading) {
    return (
      <div className="flex justify-center rounded-xl border border-border bg-card/60 p-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <p className="text-muted-foreground">{decks?.length ?? 0} deck(s) salvos</p>
        <Button onClick={onCreate} className="gap-2 bg-gold-gradient font-display font-bold tracking-widest text-gold-foreground glow-gold">
          <Plus className="h-4 w-4" /> NOVO DECK
        </Button>
      </div>
      {!decks?.length ? (
        <div className="rounded-xl border border-dashed border-border bg-card/60 p-10 text-center">
          <h3 className="text-2xl font-bold">Nenhum deck ainda</h3>
          <p className="mt-2 text-muted-foreground">Monte seu primeiro deck com até 45 cartas e no máximo 3 cópias de cada.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {decks.map((d) => {
            const total = d.deck_cards.reduce((s, c) => s + c.copies, 0);
            return (
              <div key={d.id} className={`rounded-xl border bg-card/70 p-5 ${d.is_main ? "border-gold glow-gold" : "border-border"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-display text-lg font-bold">{d.name}</h3>
                    <p className="text-sm text-muted-foreground">{total}/45 cartas</p>
                  </div>
                  {d.is_main && <Star className="h-5 w-5 fill-gold text-gold" />}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(d.id)} disabled={busy} className="gap-1">
                    <Pencil className="h-3.5 w-3.5" /> Editar
                  </Button>
                  {!d.is_main && (
                    <Button size="sm" variant="outline" onClick={() => setMain(d)} disabled={busy} className="gap-1">
                      <Star className="h-3.5 w-3.5" /> Principal
                    </Button>
                  )}
                  <Button size="sm" variant="outline" onClick={() => duplicate(d)} disabled={busy} className="gap-1">
                    <Copy className="h-3.5 w-3.5" /> Duplicar
                  </Button>
                  {confirmDelete === d.id ? (
                    <Button size="sm" variant="destructive" onClick={() => remove(d)} disabled={busy}>
                      Confirmar?
                    </Button>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => setConfirmDelete(d.id)} disabled={busy} className="gap-1 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Excluir
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
