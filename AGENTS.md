<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Duel Arena
- Exactly three main routes: `/`, `/jogar`, `/duelo/$roomId`; shared arena UI lives in `src/components/arena/` — keeps the spec's page structure.
- Card/character data lives in `src/data/catalog.ts` (to move to the database later); cards render named placeholders unless an authorized `imageUrl` exists — no unauthorized official art.
- Auth: email/password + Google + Lovable via Lovable Cloud; `/auth` (public, with `?redirect=` redirect-back) and `/reset-password` are the only auth routes; `/jogar` lives under the client-only `_authenticated` gate (ssr: false, localStorage session); root owns the single `onAuthStateChange` listener (router.invalidate + OAuth `auth_redirect` return via sessionStorage); sign-out = cancelQueries → clear → signOut → replace to `/auth`.
