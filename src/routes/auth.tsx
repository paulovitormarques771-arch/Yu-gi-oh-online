import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Lock, Mail, MailCheck, Swords, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { MagicBackdrop } from "@/components/arena/MagicBackdrop";
import { SiteNav } from "@/components/arena/SiteNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import "@lovable.dev/cloud-auth-js/styles.css";

type Mode = "entrar" | "cadastrar" | "recuperar";

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = search.redirect;
    return typeof r === "string" && r.startsWith("/") && !r.startsWith("//") ? { redirect: r } : {};
  },
  head: () => ({
    meta: [
      { title: "Entrar — Duel Arena" },
      { name: "description", content: "Crie sua conta ou entre no Duel Arena para montar decks e duelar." },
      { property: "og:title", content: "Entrar — Duel Arena" },
      { property: "og:description", content: "Crie sua conta ou entre no Duel Arena para montar decks e duelar." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("entrar");
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState<"confirmar" | "recuperar" | null>(null);

  const destination = redirect ?? "/jogar";

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: destination, replace: true });
    });
  }, [destination, navigate]);

  async function handleLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message);
      return;
    }
    navigate({ to: destination });
  }

  async function handleSignup(e: FormEvent) {
    e.preventDefault();
    if (!/^[A-Za-z0-9_]{3,20}$/.test(nickname)) {
      toast.error("O nickname deve ter 3 a 20 caracteres: letras, números e sublinhado.");
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nickname }, emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (data.session === null) {
      setEmailSent("confirmar");
    } else {
      navigate({ to: destination });
    }
  }

  async function handleReset(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmailSent("recuperar");
  }

  async function handleOAuth(provider: "google" | "lovable") {
    sessionStorage.setItem("auth_redirect", destination);
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      sessionStorage.removeItem("auth_redirect");
      toast.error("Não foi possível entrar. Tente novamente.");
    }
  }

  return (
    <div className="min-h-screen">
      <MagicBackdrop />
      <SiteNav />
      <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 py-24">
        <div className="rounded-xl border border-border bg-card/80 p-8 shadow-2xl backdrop-blur">
          <div className="mb-6 text-center">
            <Swords className="mx-auto h-10 w-10 text-gold" />
            <h1 className="mt-3 text-3xl font-black">
              {mode === "entrar" && <>Entrar na <span className="text-gold">Arena</span></>}
              {mode === "cadastrar" && <>Criar <span className="text-gold">Conta</span></>}
              {mode === "recuperar" && <>Recuperar <span className="text-gold">Senha</span></>}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {mode === "entrar" && "Seu deck espera por você, duelista."}
              {mode === "cadastrar" && "Escolha seu nickname e comece sua jornada."}
              {mode === "recuperar" && "Enviaremos um link para redefinir sua senha."}
            </p>
          </div>

          {emailSent ? (
            <div className="text-center">
              <MailCheck className="mx-auto h-12 w-12 text-primary" />
              <p className="mt-4 font-semibold">
                {emailSent === "confirmar" ? "Confirme seu e-mail" : "Link enviado"}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {emailSent === "confirmar"
                  ? `Enviamos um link de confirmação para ${email}. Clique nele para ativar sua conta e entrar na arena.`
                  : `Se existir uma conta para ${email}, você receberá um link para redefinir a senha.`}
              </p>
              <Button variant="outline" className="mt-6" onClick={() => { setEmailSent(null); setMode("entrar"); }}>
                Voltar para entrar
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={mode === "entrar" ? handleLogin : mode === "cadastrar" ? handleSignup : handleReset} className="space-y-4">
                {mode === "cadastrar" && (
                  <div className="relative">
                    <UserRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Nickname (ex: Kaiba_1996)"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="bg-background pl-9"
                      required
                      minLength={3}
                      maxLength={20}
                    />
                  </div>
                )}
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="email"
                    placeholder="Seu e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="bg-background pl-9"
                    required
                  />
                </div>
                {mode !== "recuperar" && (
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Senha"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="bg-background pl-9"
                      required
                      minLength={6}
                    />
                  </div>
                )}
                <Button type="submit" disabled={loading} className="w-full bg-gold-gradient font-display font-bold tracking-widest text-gold-foreground glow-gold">
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {mode === "entrar" && "ENTRAR"}
                  {mode === "cadastrar" && "CRIAR CONTA"}
                  {mode === "recuperar" && "ENVIAR LINK"}
                </Button>
              </form>

              {mode !== "recuperar" && (
                <>
                  <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
                    <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
                  </div>
                  <div className="space-y-2">
                    <Button type="button" variant="outline" className="w-full" onClick={() => handleOAuth("google")}>
                      Continuar com Google
                    </Button>
                    <button type="button" className="lovable-auth-button w-full" onClick={() => handleOAuth("lovable")}>
                      Continuar com Lovable
                    </button>
                  </div>
                </>
              )}

              <div className="mt-6 space-y-1 text-center text-sm">
                {mode === "entrar" && (
                  <>
                    <button type="button" onClick={() => setMode("recuperar")} className="block w-full text-muted-foreground hover:text-foreground">
                      Esqueci minha senha
                    </button>
                    <button type="button" onClick={() => setMode("cadastrar")} className="block w-full text-primary hover:underline">
                      Não tem conta? Cadastre-se
                    </button>
                  </>
                )}
                {mode === "cadastrar" && (
                  <button type="button" onClick={() => setMode("entrar")} className="text-primary hover:underline">
                    Já tem conta? Entrar
                  </button>
                )}
                {mode === "recuperar" && (
                  <button type="button" onClick={() => setMode("entrar")} className="text-primary hover:underline">
                    Voltar para entrar
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
