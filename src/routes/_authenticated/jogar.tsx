import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bot, History, Layers, Library, Link2, UserRound, Users, Swords } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { CHARACTERS } from "@/data/catalog";
import { ALL_CARDS } from "@/data/cards";
import { DuelCard } from "@/components/arena/DuelCard";
import { MagicBackdrop } from "@/components/arena/MagicBackdrop";
import { SiteNav } from "@/components/arena/SiteNav";
import { ProfilePanel } from "@/components/arena/ProfilePanel";
import { DeckBuilder } from "@/components/arena/DeckBuilder";
import { DeckList } from "@/components/arena/DeckList";
import { CardZoom } from "@/components/arena/CardZoom";
import { HoloDeck } from "@/components/arena/HoloDeck";
import { OnlineLobby } from "@/components/arena/OnlineLobby";
import type { CardData } from "@/data/catalog";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { DIFFICULTY_LABELS, isDifficulty, type AIDifficulty } from "@/lib/duel-training";

export const Route = createFileRoute("/_authenticated/jogar")({
  head: () => ({
    meta: [
      { title: "Central do Duelista — Duel Arena" },
      { name: "description", content: "Seu perfil, personagem, coleção de cartas, decks e duelos no Duel Arena." },
      { property: "og:title", content: "Central do Duelista — Duel Arena" },
      { property: "og:description", content: "Escolha seu personagem, monte seu deck e desafie amigos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Jogar,
});

const tabs = [
  { v: "perfil", l: "Meu perfil", i: UserRound },
  { v: "personagem", l: "Personagem", i: Users },
  { v: "colecao", l: "Coleção", i: Library },
  { v: "criar", l: "Criar deck", i: Layers },
  { v: "decks", l: "Meus decks", i: Layers },
  { v: "ia", l: "Treinar vs IA", i: Bot },
  { v: "convidar", l: "Convidar amigo", i: Link2 },
  { v: "historico", l: "Histórico", i: History },
];

function Soon({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/60 p-10 text-center">
      <h3 className="text-2xl font-bold">{title}</h3>
      <p className="mt-2 text-muted-foreground">{text}</p>
    </div>
  );
}

function Jogar() {
  const [tab, setTab] = useState("perfil");
  const [editingDeck, setEditingDeck] = useState<string | null>(null);
  const [selected, setSelected] = useState("yugi-muto");
  const [q, setQ] = useState("");
  const [zoom, setZoom] = useState<CardData | null>(null);
  const [difficulty, setDifficulty] = useState<AIDifficulty>("normal");
  const [kind, setKind] = useState<"all" | "monster" | "spell" | "trap">("all");
  const list = useMemo(
    () => ALL_CARDS.filter((c) => (kind === "all" || c.kind === kind) && c.name.toLowerCase().includes(q.toLowerCase())),
    [q, kind],
  );

  return (
    <div className="min-h-screen">
      <MagicBackdrop />
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-24">
        <HoloDeck />
        <h1 className="mt-8 text-3xl font-black md:text-5xl">Central do <span className="text-gold">Duelista</span></h1>
        <Tabs value={tab} onValueChange={setTab} className="mt-8">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-card/70">
            {tabs.map((t) => (
              <TabsTrigger key={t.v} value={t.v} className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <t.i className="h-4 w-4" />{t.l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="perfil" className="mt-6"><ProfilePanel /></TabsContent>

          <TabsContent value="personagem" className="mt-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {CHARACTERS.map((ch) => (
                <button key={ch.id} onClick={() => setSelected(ch.id)}
                  className={`rounded-lg border bg-card/70 p-4 text-left transition hover:border-primary ${selected === ch.id ? "border-gold glow-gold" : "border-border"}`}>
                  <div className="mb-3 aspect-square overflow-hidden rounded-md bg-secondary">
                    <img src={ch.imageUrl} alt={ch.name} loading="lazy" width={768} height={1024} className="h-full w-full object-cover" />
                  </div>
                  <p className="font-bold">{ch.name}</p>
                  <p className="text-xs text-primary">{ch.style}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{ch.description}</p>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="colecao" className="mt-6">
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <Input placeholder="Buscar carta..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs bg-card" />
              {(["all", "monster", "spell", "trap"] as const).map((k) => (
                <button key={k} onClick={() => setKind(k)}
                  className={`rounded-md border px-3 text-sm font-semibold ${kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                  {{ all: "Todas", monster: "Monstros", spell: "Magias", trap: "Armadilhas" }[k]}
                </button>
              ))}
              <span className="text-sm text-muted-foreground">{list.length} cartas da era clássica do anime</span>
            </div>
            <div className="flex flex-wrap gap-5">{list.map((c) => <button key={c.id} type="button" onClick={() => setZoom(c)} aria-label={`Ver ${c.name}`} className="rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"><DuelCard card={c} /></button>)}</div>
          </TabsContent>

          <TabsContent value="criar" className="mt-6">
            <DeckBuilder
              deckId={editingDeck}
              onSaved={() => { setEditingDeck(null); setTab("decks"); }}
              onCancel={() => { setEditingDeck(null); setTab("decks"); }}
            />
          </TabsContent>
          <TabsContent value="decks" className="mt-6">
            <DeckList
              onEdit={(id) => { setEditingDeck(id); setTab("criar"); }}
              onCreate={() => { setEditingDeck(null); setTab("criar"); }}
            />
          </TabsContent>
          <TabsContent value="ia" className="mt-6">
            <section className="training-select">
              <Bot className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-2 text-2xl font-bold">Treinar contra a IA</h3>
              <ToggleGroup type="single" value={difficulty} className="mt-6" aria-label="Dificuldade da IA" onValueChange={(value) => { if (isDifficulty(value)) setDifficulty(value); }}>
                {Object.entries(DIFFICULTY_LABELS).map(([value, label]) => <ToggleGroupItem value={value} key={value} variant="outline">{label}</ToggleGroupItem>)}
              </ToggleGroup>
              <Button asChild size="lg" className="mt-6"><Link to="/duelo/$roomId" params={{ roomId: "treino" }} search={{ difficulty }}><Swords />Duelar contra a IA</Link></Button>
            </section>
          </TabsContent>
          <TabsContent value="convidar" className="mt-6"><OnlineLobby /></TabsContent>
          <TabsContent value="historico" className="mt-6"><Soon title="Histórico de duelos" text="Suas partidas serão registradas a partir dos próximos duelos." /></TabsContent>
        </Tabs>
      </main>
      <CardZoom card={zoom} onClose={() => setZoom(null)} />
    </div>
  );
}
