import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { LogOut, Swords, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthUser } from "@/hooks/use-auth-user";

export function SiteNav() {
  const { data: user } = useAuthUser();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("nickname")
        .eq("id", user!.id)
        .single();
      return data;
    },
  });

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-lg font-black tracking-widest">
          <Swords className="h-5 w-5 text-gold" /> <span className="text-gold">DUEL</span><span className="text-energy">ARENA</span>
        </Link>
        <div className="flex items-center gap-5 text-sm font-semibold uppercase tracking-wider">
          <Link to="/" activeOptions={{ exact: true }} className="text-muted-foreground hover:text-foreground [&.active]:text-primary">Início</Link>
          <Link to="/jogar" className="text-muted-foreground hover:text-foreground [&.active]:text-primary">Jogar</Link>
          <Link to="/duelo/$roomId" params={{ roomId: "treino" }} className="text-muted-foreground hover:text-foreground [&.active]:text-primary">Arena</Link>
          {user ? (
            <span className="flex items-center gap-3">
              <Link to="/jogar" className="flex items-center gap-1.5 text-gold hover:opacity-80">
                <UserRound className="h-4 w-4" /> {profile?.nickname ?? "Conta"}
              </Link>
              <button onClick={signOut} title="Sair" className="text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
              </button>
            </span>
          ) : (
            <Link to="/auth" className="rounded-md bg-gold-gradient px-4 py-1.5 font-display font-bold text-gold-foreground glow-gold">
              Entrar
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
}

export function DuelButton({ children }: { children: ReactNode }) {
  return (
    <Link
      to="/jogar"
      className="group relative inline-flex items-center gap-3 rounded-md bg-gold-gradient px-10 py-4 font-display text-xl font-black tracking-widest text-gold-foreground glow-gold transition-transform hover:scale-105"
    >
      <Swords className="h-6 w-6 transition-transform group-hover:rotate-12" />
      {children}
    </Link>
  );
}
