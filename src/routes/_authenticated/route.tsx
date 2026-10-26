import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

// The session lives in localStorage, which SSR cannot read — this gate runs
// client-only (ssr: false) and bounces anonymous visitors to /auth.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) {
      throw redirect({ to: "/auth", search: { redirect: location.href } });
    }
  },
  component: () => <Outlet />,
});
