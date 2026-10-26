import { createFileRoute } from "@tanstack/react-router";
import { motion, useScroll, useTransform } from "framer-motion";
import { Link2, Layers, Swords, UserRound } from "lucide-react";
import { CARDS, CHARACTERS } from "@/data/catalog";
import { DuelCard } from "@/components/arena/DuelCard";
import { MagicBackdrop } from "@/components/arena/MagicBackdrop";
import { DuelButton, SiteNav } from "@/components/arena/SiteNav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Duel Arena — Seu destino. Suas cartas. Seu duelo." },
      { name: "description", content: "Monte seu deck, desperte seus monstros e desafie seus amigos em duelos de cartas online com arena 3D." },
      { property: "og:title", content: "Duel Arena — Seu destino. Suas cartas. Seu duelo." },
      { property: "og:description", content: "Monte seu deck, desperte seus monstros e desafie seus amigos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const hero = [CARDS[0]!, CARDS[2]!, CARDS[3]!];
const legends = CARDS.filter((c) => c.rarity === "lendaria");

function Landing() {
  const { scrollY } = useScroll();
  const yCards = useTransform(scrollY, [0, 600], [0, 180]);
  const yText = useTransform(scrollY, [0, 600], [0, -80]);

  return (
    <div className="relative overflow-x-hidden">
      <MagicBackdrop />
      <SiteNav />

      {/* Apresentação */}
      <section className="relative flex min-h-screen flex-col items-center justify-center px-4 pt-20 text-center">
        <motion.div style={{ y: yText }} initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1 }}>
          <p className="mb-4 font-display text-sm tracking-[0.5em] text-primary">DUEL ARENA</p>
          <h1 className="max-w-4xl text-4xl font-black leading-tight md:text-7xl">
            <span className="text-gold">SEU DESTINO.</span> <span className="text-energy">SUAS CARTAS.</span> SEU DUELO.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
            Monte seu deck, desperte seus monstros e desafie seus amigos.
          </p>
          <div className="mt-10"><DuelButton>VAMOS DUELAR!</DuelButton></div>
        </motion.div>
        <motion.div style={{ y: yCards }} className="perspective-arena mt-16 flex gap-4 md:gap-8">
          {hero.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, rotateX: 40, y: 80 }} animate={{ opacity: 1, rotateX: 15, y: [0, -14, 0] }}
              transition={{ opacity: { delay: 0.4 + i * 0.2 }, rotateX: { delay: 0.4 + i * 0.2 }, y: { duration: 4 + i, repeat: Infinity, ease: "easeInOut" } }}
              className={i === 1 ? "-mt-8" : ""}>
              <DuelCard card={c} className="w-32 md:w-48" />
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Vídeo */}
      <Section title="O despertar da arena" kicker="Trailer">
        <div className="mx-auto flex aspect-video max-w-4xl items-center justify-center rounded-xl border border-border bg-card/60 glow-magic">
          <div className="text-center text-muted-foreground">
            <Swords className="mx-auto mb-3 h-10 w-10 text-primary" />
            <p className="font-display">Espaço reservado para vídeo autorizado</p>
            <p className="text-sm">O vídeo começará sem som e só será carregado quando disponível.</p>
          </div>
        </div>
      </Section>

      {/* Personagens */}
      <Section title="Duelistas lendários" kicker="Personagens">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {CHARACTERS.slice(0, 10).map((ch, i) => (
            <motion.div key={ch.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: (i % 5) * 0.08 }}
              className="rounded-lg border border-border bg-card/70 p-4 transition hover:border-primary hover:glow-primary">
              <div className="mb-3 flex aspect-square items-center justify-center rounded-md bg-secondary font-display text-3xl text-primary">
                {ch.name.split(" ").map((w) => w[0]).join("").slice(0, 2)}
              </div>
              <h3 className="text-sm font-bold">{ch.name}</h3>
              <p className="text-xs text-muted-foreground">{ch.style}</p>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Lendárias */}
      <Section title="Cartas lendárias" kicker="Galeria">
        <div className="perspective-arena flex flex-wrap justify-center gap-6">
          {legends.map((c, i) => (
            <motion.div key={c.id} initial={{ opacity: 0, rotateY: -60 }} whileInView={{ opacity: 1, rotateY: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.7 }}>
              <DuelCard card={c} />
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Campo */}
      <Section title="O campo de batalha" kicker="Arena">
        <div className="perspective-arena mx-auto max-w-4xl">
          <div className="grid grid-cols-5 gap-3 rounded-2xl border border-primary/40 bg-card/40 p-6 glow-primary" style={{ transform: "rotateX(50deg)" }}>
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className={`aspect-[59/86] rounded border ${i < 5 ? "border-destructive/50" : "border-primary/60"} bg-background/40`} />
            ))}
          </div>
        </div>
      </Section>

      {/* Como jogar */}
      <Section title="Como jogar online" kicker="Em 4 passos">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { icon: UserRound, t: "Crie sua conta", d: "Escolha nickname, avatar e personagem." },
            { icon: Layers, t: "Monte seu deck", d: "Até 45 cartas, no máximo 3 cópias." },
            { icon: Link2, t: "Convide por link", d: "Envie o link da sala para um amigo." },
            { icon: Swords, t: "Duele!", d: "Ataque, defenda e reduza os LP a zero." },
          ].map((s, i) => (
            <div key={s.t} className="rounded-lg border border-border bg-card/70 p-5">
              <s.icon className="mb-3 h-8 w-8 text-primary" />
              <p className="font-display text-xs text-gold">PASSO {i + 1}</p>
              <h3 className="font-bold">{s.t}</h3>
              <p className="text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
        <div className="mt-12 text-center"><DuelButton>VAMOS DUELAR!</DuelButton></div>
      </Section>

      <footer className="border-t border-border py-8 text-center text-xs text-muted-foreground">
        Projeto de fãs para fins didáticos. Não é oficial nem afiliado ou patrocinado pela Konami.
      </footer>
    </div>
  );
}

function Section({ title, kicker, children }: { title: string; kicker: string; children: import("react").ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-24">
      <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="mb-12 text-center">
        <p className="font-display text-xs tracking-[0.4em] text-primary">{kicker.toUpperCase()}</p>
        <h2 className="mt-2 text-3xl font-black md:text-5xl">{title}</h2>
      </motion.div>
      {children}
    </section>
  );
}
