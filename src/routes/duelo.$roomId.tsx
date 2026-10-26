import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { CARDS } from "@/data/catalog";
import { DuelCard } from "@/components/arena/DuelCard";
import { MagicBackdrop } from "@/components/arena/MagicBackdrop";

export const Route = createFileRoute("/duelo/$roomId")({
  head: ({ params }) => ({
    meta: [
      { title: `Arena de Duelo · ${params.roomId} — Duel Arena` },
      { name: "description", content: "Arena de batalha do Duel Arena." },
      { property: "og:title", content: "Arena de Duelo — Duel Arena" },
      { property: "og:description", content: "Você foi desafiado para um duelo!" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Duelo,
});

function Zones({ enemy }: { enemy?: boolean }) {
  const color = enemy ? "border-destructive/50" : "border-primary/60";
  return (
    <div className="grid grid-cols-5 gap-2 md:gap-3">
      {Array.from({ length: 10 }, (_, i) => (
        <div key={i} className={`aspect-[59/86] rounded border ${color} bg-background/40`} />
      ))}
    </div>
  );
}

function Lp({ name, lp, enemy }: { name: string; lp: number; enemy?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-card/80 px-4 py-2 backdrop-blur">
      <p className="font-display text-xs text-muted-foreground">{name}</p>
      <p className={`font-display text-2xl font-black ${enemy ? "text-destructive" : "text-primary"}`}>LP {lp}</p>
    </div>
  );
}

function Duelo() {
  const { roomId } = Route.useParams();
  const hand = CARDS.slice(0, 5);
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden">
      <MagicBackdrop />
      <div className="flex items-center justify-between p-4">
        <Link to="/jogar" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Sair</Link>
        <p className="font-display text-sm tracking-widest text-gold">SALA {roomId.toUpperCase()}</p>
        <Lp name="Oponente" lp={8000} enemy />
      </div>
      <div className="perspective-arena flex flex-1 items-center justify-center px-4">
        <motion.div initial={{ rotateX: 70, opacity: 0 }} animate={{ rotateX: 40, opacity: 1 }} transition={{ duration: 1.2 }}
          className="w-full max-w-3xl space-y-6 rounded-2xl border border-primary/40 bg-card/30 p-4 glow-primary md:p-8">
          <Zones enemy />
          <div className="h-px bg-energy" />
          <Zones />
        </motion.div>
      </div>
      <div className="flex items-end justify-between gap-4 p-4">
        <Lp name="Você" lp={8000} />
        <div className="flex -space-x-10">
          {hand.map((c, i) => (
            <motion.div key={c.id} initial={{ y: 200 }} animate={{ y: 0 }} transition={{ delay: 1 + i * 0.1 }} style={{ rotate: (i - 2) * 5 }}>
              <DuelCard card={c} className="w-24 md:w-32" />
            </motion.div>
          ))}
        </div>
        <p className="max-w-[10rem] text-right text-xs text-muted-foreground">Motor de regras chega na Etapa 4.</p>
      </div>
    </div>
  );
}
