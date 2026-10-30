import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Loader2, Minus, Plus, Save, X } from "lucide-react";
import { CardZoom } from "@/components/arena/CardZoom";
import type { CardData } from "@/data/catalog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ALL_CARDS, CARDS_BY_ID } from "@/data/cards";
import { cardImageSmallUrl } from "@/data/catalog";
import {
  addCard,
  canAddCard,
  copiesOf,
  MAX_DECK_SIZE,
  removeCard,
  totalCards,
  type DeckEntry,
} from "@/lib/deck-rules";
import { useAuthUser } from "@/hooks/use-auth-user";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const kindLabels = { all: "Todas", monster: "Monstros", spell: "Magias", trap: "Armadilhas" } as const;

export function DeckBuilder({
  deckId,
  onSaved,
  onCancel,
}: {
  deckId: string | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const { data: user } = useAuthUser();
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [entries, setEntries] = useState<DeckEntry[]>([]);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<keyof typeof kindLabels>("all");
  const [saving, setSaving] = useState(false);
  const [zoom, setZoom] = useState<CardData | null>(null);
  const [loadingDeck, setLoadingDeck] = useState(false);

  useEffect(() => {
    setEntries([]);
    setName("");
    if (!deckId) return;
    setLoadingDeck(true);
    (async () => {
      const { data: deck } = await supabase.from("decks").select("name").eq("id", deckId).single();
      const { data: dc } = await supabase.from("deck_cards").select("card_id, copies").eq("deck_id", deckId);
      if (deck) setName(deck.name);
      if (dc) setEntries(dc.map((r) => ({ cardId: Number(r.card_id), copies: r.copies })));
      setLoadingDeck(false);
    })();
  }, [deckId]);

  const [limit, setLimit] = useState(60);
  useEffect(() => setLimit(60), [q, kind]);
  const filtered = useMemo(
    () =>
      ALL_CARDS.filter(
        (c) => (kind === "all" || c.kind === kind) && c.name.toLowerCase().includes(q.toLowerCase()),
      ),
    [q, kind],
  );
  const list = filtered.slice(0, limit);
  const total = totalCards(entries);

  function add(id: number) {
    const check = canAddCard(entries, id);
    if (!check.ok) {
      toast.error(check.reason);
      return;
    }
    setEntries(addCard(entries, id));
  }

  async function save() {
    if (!user) return;
    if (!name.trim()) {
      toast.error("Dê um nome ao deck.");
      return;
    }
    if (total === 0) {
      toast.error("Adicione pelo menos 1 carta ao deck.");
      return;
    }
    setSaving(true);
    let id = deckId;
    if (id) {
      const { error } = await supabase.from("decks").update({ name: name.trim() }).eq("id", id);
      if (error) {
        toast.error(error.message);
        setSaving(false);
        return;
      }
      await supabase.from("deck_cards").delete().eq("deck_id", id);
    } else {
      const { data, error } = await supabase
        .from("decks")
        .insert({ name: name.trim(), user_id: user.id })
        .select("id")
        .single();
      if (error || !data) {
        toast.error(error?.message ?? "Erro ao criar o deck.");
        setSaving(false);
        return;
      }
      id = data.id;
    }
    const { error } = await supabase
      .from("deck_cards")
      .insert(entries.map((e) => ({ deck_id: id!, card_id: e.cardId, copies: e.copies })));
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Deck salvo!");
    queryClient.invalidateQueries({ queryKey: ["decks", user.id] });
    onSaved();
  }

  if (loadingDeck) {
    return (
      <div className="flex justify-center rounded-xl border border-border bg-card/60 p-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Card picker */}
      <div>
        <div className="mb-4 flex flex-wrap gap-2">
          <Input placeholder="Buscar carta..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs bg-card" />
          {(Object.keys(kindLabels) as (keyof typeof kindLabels)[]).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`rounded-md border px-3 text-sm font-semibold ${kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}
            >
              {kindLabels[k]}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {list.map((c) => {
            const n = copiesOf(entries, c.id);
            return (
              <div key={c.id} className="relative">
              <button
                onClick={() => add(c.id)}
                className="group relative overflow-hidden rounded-md border border-border transition hover:border-primary hover:glow-primary"
                title={c.name}
              >
                <img src={cardImageSmallUrl(c.id)} alt={c.name} loading="lazy" className="w-full" />
                {n > 0 && (
                  <span className="absolute right-1 top-1 rounded-full bg-gold-gradient px-2 py-0.5 text-xs font-black text-gold-foreground">
                    ×{n}
                  </span>
                )}
                <span className="absolute inset-x-0 bottom-0 bg-background/85 px-1 py-0.5 text-center text-[10px] font-semibold opacity-0 transition group-hover:opacity-100">
                  + adicionar
                </span>
              </button>
              <button type="button" onClick={() => setZoom(c)} aria-label={`Ver ${c.name} em detalhes`} className="absolute left-1 top-1 rounded-full bg-background/85 p-1.5 text-primary transition hover:bg-primary hover:text-primary-foreground"><Eye className="h-3.5 w-3.5" /></button>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">Mostrando {list.length} de {filtered.length} cartas</p>
          {list.length < filtered.length && (
            <div className="flex gap-2">
              <button type="button" onClick={() => setLimit((l) => l + 60)} className="rounded-md border border-primary/60 px-4 py-2 text-sm font-bold text-primary transition hover:bg-primary/10">Ver mais 60</button>
              <button type="button" onClick={() => setLimit(filtered.length)} className="rounded-md border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary">Ver todas</button>
            </div>
          )}
        </div>
      </div>

      {/* Deck panel */}
      <aside className="h-fit rounded-xl border border-border bg-card/70 p-5 lg:sticky lg:top-20">
        <h3 className="font-display text-lg font-bold">{deckId ? "Editar deck" : "Novo deck"}</h3>
        <Input
          placeholder="Nome do deck"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={40}
          className="mt-3 bg-background"
        />
        <p className={`mt-2 text-sm font-bold ${total > MAX_DECK_SIZE ? "text-destructive" : "text-muted-foreground"}`}>
          {total}/{MAX_DECK_SIZE} cartas · máx. 3 cópias
        </p>
        <div className="mt-3 max-h-80 space-y-1 overflow-y-auto pr-1">
          {entries.length === 0 && <p className="text-sm text-muted-foreground">Clique nas cartas para adicionar.</p>}
          {entries.map((e) => {
            const card = CARDS_BY_ID.get(e.cardId);
            if (!card) return null;
            return (
              <div key={e.cardId} className="flex items-center gap-2 rounded-md border border-border bg-background/60 p-1.5">
                <img src={cardImageSmallUrl(e.cardId)} alt="" loading="lazy" className="h-10 w-7 rounded-sm object-cover" />
                <button type="button" onClick={() => setZoom(card)} className="min-w-0 flex-1 truncate text-left text-xs font-semibold hover:text-primary">{card.name}</button>
                <button onClick={() => setEntries(removeCard(entries, e.cardId))} className="rounded p-1 hover:bg-secondary" title="Remover">
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-5 text-center text-xs font-bold">{e.copies}</span>
                <button onClick={() => add(e.cardId)} className="rounded p-1 hover:bg-secondary" title="Adicionar">
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={save} disabled={saving} className="flex-1 gap-2 bg-gold-gradient font-display font-bold tracking-widest text-gold-foreground glow-gold">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            SALVAR
          </Button>
          {deckId && (
            <Button variant="outline" onClick={onCancel} className="gap-1">
              <X className="h-4 w-4" /> Cancelar
            </Button>
          )}
        </div>
      </aside>
      <CardZoom card={zoom} onClose={() => setZoom(null)} actions={zoom ? <><Button onClick={() => add(zoom.id)}><Plus />Adicionar ao deck ({copiesOf(entries, zoom.id)}/3)</Button><Button variant="outline" disabled={!copiesOf(entries, zoom.id)} onClick={() => setEntries(removeCard(entries, zoom.id))}><Minus />Remover</Button></> : undefined} />
    </div>
  );
}
