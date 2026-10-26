import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bot, History, Layers, Library, Link2, UserRound, Users, Swords } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { CARDS, CHARACTERS } from "@/data/catalog";
import { DuelCard } from "@/components/arena/DuelCard";
import { MagicBackdrop } from "@/components/arena/MagicBackdrop";
import { SiteNav } from "@/components/arena/SiteNav";

export const Route = createFileRoute("/jogar")({
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
  const [selected, setSelected] = useState("yugi-muto");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "monster" | "spell" | "trap">("all");
  const list = useMemo(
    () => CARDS.filter((c) => (kind === "all" || c.kind === kind) && c.name.toLowerCase().includes(q.toLowerCase())),
    [q, kind],
  );

  return (
    <div className="min-h-screen">
      <MagicBackdrop />
      <SiteNav />
      <main className="mx-auto max-w-7xl px-4 pb-20 pt-24">
        <h1 className="text-3xl font-black md:text-5xl">Central do <span className="text-gold">Duelista</span></h1>
        <Tabs defaultValue="personagem" className="mt-8">
          <TabsList className="flex h-auto flex-wrap justify-start gap-1 bg-card/70">
            {tabs.map((t) => (
              <TabsTrigger key={t.v} value={t.v} className="gap-1.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <t.i className="h-4 w-4" />{t.l}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="perfil" className="mt-6"><Soon title="Conta e perfil" text="Cadastro, login, nickname único, avatar e preferências chegam na Etapa 2." /></TabsContent>

          <TabsContent value="personagem" className="mt-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {CHARACTERS.map((ch) => (
                <button key={ch.id} onClick={() => setSelected(ch.id)}
                  className={`rounded-lg border bg-card/70 p-4 text-left transition hover:border-primary ${selected === ch.id ? "border-gold glow-gold" : "border-border"}`}>
                  <div className="mb-3 flex aspect-square items-center justify-center rounded-md bg-secondary font-display text-2xl text-primary">
                    {ch.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
                  </div>
                  <p className="font-bold">{ch.name}</p>
                  <p className="text-xs text-primary">{ch.style}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{ch.description}</p>
                </button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="colecao" className="mt-6">
            <div className="mb-6 flex flex-wrap gap-2">
              <Input placeholder="Buscar carta..." value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs bg-card" />
              {(["all", "monster", "spell", "trap"] as const).map((k) => (
                <button key={k} onClick={() => setKind(k)}
                  className={`rounded-md border px-3 text-sm font-semibold ${kind === k ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card"}`}>
                  {{ all: "Todas", monster: "Monstros", spell: "Magias", trap: "Armadilhas" }[k]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-5">{list.map((c) => <DuelCard key={c.id} card={c} />)}</div>
          </TabsContent>

          <TabsContent value="criar" className="mt-6"><Soon title="Construtor de decks" text="Até 45 cartas e no máximo 3 cópias — chega na Etapa 3." /></TabsContent>
          <TabsContent value="decks" className="mt-6"><Soon title="Meus decks" text="Salvar, renomear, duplicar e escolher deck principal — Etapa 3." /></TabsContent>
          <TabsContent value="ia" className="mt-6">
            <div className="rounded-xl border border-border bg-card/60 p-10 text-center">
              <Bot className="mx-auto h-10 w-10 text-primary" />
              <h3 className="mt-2 text-2xl font-bold">Treinar contra a IA</h3>
              <p className="mt-2 text-muted-foreground">O oponente controlado pelo computador chega na Etapa 5. Já é possível conhecer a arena.</p>
              <Link to="/duelo/$roomId" params={{ roomId: "treino" }} className="mt-6 inline-flex items-center gap-2 rounded-md bg-energy px-6 py-3 font-display font-bold text-primary-foreground glow-primary">
                <Swords className="h-5 w-5" /> Entrar na arena
              </Link>
            </div>
          </TabsContent>
          <TabsContent value="convidar" className="mt-6"><Soon title="Convidar amigo" text="Salas online com link de convite chegam na Etapa 6." /></TabsContent>
          <TabsContent value="historico" className="mt-6"><Soon title="Histórico de duelos" text="Suas partidas serão registradas após a Etapa 2." /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
