import * as Dialog from "@radix-ui/react-dialog";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Flag, Layers, Loader2, Shield, Star, Swords } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ArenaBackdrop } from "@/components/arena/ArenaBackdrop";
import { ArenaCard } from "@/components/arena/ArenaCard";
import { ALL_CARDS } from "@/data/cards";
import type { CardData } from "@/data/catalog";
import { useAuthUser } from "@/hooks/use-auth-user";
import { supabase } from "@/integrations/supabase/client";
import { quickDeck } from "@/lib/duel-engine";
import { savedDeckCards, type SavedDuelDeck } from "@/lib/duel-setup";
import { DIFFICULTY_LABELS, isDifficulty, type AIDifficulty } from "@/lib/duel-training";

export type DuelSelection = { deck: CardData[]; opponentDeck: CardData[]; difficulty: AIDifficulty };

export function DuelSetup({ vsAI = false, local = false, initialDifficulty = "normal", onStart, busy = false, onExit, exiting = false }: {
  vsAI?: boolean; local?: boolean; initialDifficulty?: AIDifficulty; busy?: boolean; onStart: (selection: DuelSelection) => void; onExit?: () => void; exiting?: boolean;
}) {
  const { data: user, isPending: authPending } = useAuthUser();
  const [deckId, setDeckId] = useState("automatic");
  const [opponentDeckId, setOpponentDeckId] = useState("automatic");
  const [difficulty, setDifficulty] = useState(initialDifficulty);
  const automatic = useMemo(() => quickDeck(ALL_CARDS, 7281), []);
  const { data: decks = [], isPending, isError, refetch } = useQuery({
    queryKey: ["duel-setup-decks", user?.id], enabled: !!user,
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase.from("decks").select("id, name, is_main, deck_cards(card_id, copies)").eq("user_id", user.id).order("is_main", { ascending: false }).order("created_at");
      if (error) throw error;
      return data as SavedDuelDeck[];
    },
  });
  const options = [{ id: "automatic", name: "Deck da Arena", cards: automatic, main: false, error: "" }, ...decks.map((deck) => {
    try { return { id: deck.id, name: deck.name, cards: savedDeckCards(deck), main: deck.is_main, error: "" }; }
    catch (error) { return { id: deck.id, name: deck.name, cards: [] as CardData[], main: deck.is_main, error: error instanceof Error ? error.message : "Deck indisponível" }; }
  })];
  const chosen = options.find((option) => option.id === deckId) ?? options[0];
  const other = options.find((option) => option.id === opponentDeckId) ?? options[0];
  const loading = authPending || (!!user && isPending);
  return <div className="duel-screen"><ArenaBackdrop />
    <Dialog.Root open>
      <Dialog.Portal>
        <Dialog.Overlay className="duel-setup-overlay" />
        <Dialog.Content className="duel-setup" aria-describedby={undefined} onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()}>
          <header className="duel-setup-heading"><Swords aria-hidden="true" /><div><span>DUEL ARENA · {vsAI ? "TREINO" : local ? "DUELO LOCAL" : "DUELO ONLINE"}</span><Dialog.Title>Prepare seu duelo</Dialog.Title></div></header>
          <div className="duel-setup-body">
            <section aria-label="Escolha de deck"><h2><Layers />{local ? "Deck do Jogador 1" : "Escolha seu deck"}</h2>
              {loading && <p className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando seus decks…</p>}
              {isError && <div className="text-destructive">Não foi possível carregar seus decks. <Button variant="ghost" size="sm" onClick={() => void refetch()}>Tentar novamente</Button></div>}
              <div className="duel-deck-options" role="radiogroup" aria-label="Seu deck">{options.map((option) => <Button key={option.id} role="radio" aria-checked={deckId === option.id} variant="outline" className="duel-deck-option" disabled={busy || !!option.error} onClick={() => setDeckId(option.id)}>
                <Layers /><span><strong>{option.name}{option.main && <Star aria-label="Deck principal" />}</strong><small>{option.error || `${option.cards.length} cartas`}</small></span><Shield className="deck-selected-mark" />
              </Button>)}</div>
              {local && <><h2 className="mt-5"><Layers />Deck do Jogador 2</h2><ToggleGroup type="single" className="duel-opponent-decks" value={opponentDeckId} onValueChange={(value) => { if (value) setOpponentDeckId(value); }} aria-label="Deck do Jogador 2">{options.filter((option) => !option.error).map((option) => <ToggleGroupItem value={option.id} key={option.id} variant="outline">{option.name}</ToggleGroupItem>)}</ToggleGroup></>}
            </section>
            <section className="duel-deck-preview" aria-label="Prévia do deck"><h2>{chosen?.name}</h2><div className="duel-deck-fan">{chosen?.cards.slice(0, 3).map((card, i) => <ArenaCard key={`${card.id}-${i}`} card={card} />)}</div>
              {vsAI && <><h2>Dificuldade da IA</h2><ToggleGroup type="single" value={difficulty} className="duel-setup-difficulty" onValueChange={(value) => { if (isDifficulty(value)) setDifficulty(value); }} aria-label="Dificuldade da IA">{Object.entries(DIFFICULTY_LABELS).map(([value, label]) => <ToggleGroupItem value={value} key={value} variant="outline">{label}</ToggleGroupItem>)}</ToggleGroup></>}
            </section>
          </div>
          <footer className="duel-setup-footer">{onExit ? <Button variant="ghost" disabled={busy || exiting} onClick={onExit}><Flag />{exiting ? "Saindo…" : "Desistir e voltar ao menu"}</Button> : <Button asChild variant="ghost"><Link to="/jogar"><Flag />Desistir e voltar ao menu</Link></Button>}<Button className="duel-replay-button" size="lg" disabled={busy || exiting || loading || !chosen?.cards.length || (local && !other?.cards.length)} onClick={() => { if (chosen && other) onStart({ deck: chosen.cards, opponentDeck: other.cards, difficulty }); }}>{busy ? <Loader2 className="animate-spin" /> : <Swords />}{busy ? "Preparando…" : "Começar duelo"}</Button></footer>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  </div>;
}