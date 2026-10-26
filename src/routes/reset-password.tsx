import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Loader2, Lock, Swords } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MagicBackdrop } from "@/components/arena/MagicBackdrop";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Duel Arena" },
      { name: "description", content: "Defina uma nova senha para sua conta do Duel Arena." },
      { property: "og:title", content: "Redefinir senha — Duel Arena" },
      { property: "og:description", content: "Defina uma nova senha para sua conta do Duel Arena." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      toast.error("As senhas não coincidem.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(
        error.message.includes("session")
          ? "O link de recuperação expirou. Peça um novo na tela de entrada."
          : error.message,
      );
      return;
    }
    toast.success("Senha redefinida! Bem-vindo de volta à arena.");
    navigate({ to: "/jogar" });
  }

  return (
    <div className="min-h-screen">
      <MagicBackdrop />
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-24">
        <div className="rounded-xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 text-center">
            <Swords className="mx-auto h-10 w-10 text-gold" />
            <h1 className="mt-3 text-3xl font-black">
              Nova <span className="text-gold">Senha</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">Escolha uma nova senha para sua conta.</p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Nova senha"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-background pl-9"
                required
                minLength={6}
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="password"
                placeholder="Confirmar nova senha"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="bg-background pl-9"
                required
                minLength={6}
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-gold-gradient font-display font-bold tracking-widest text-gold-foreground glow-gold">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              REDEFINIR SENHA
            </Button>
          </form>
          <p className="mt-6 text-center text-sm">
            <Link to="/auth" className="text-primary hover:underline">
              Voltar para entrar
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
