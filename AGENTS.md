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
- Card catalog: 479 classic anime-era cards live in `src/data/cards.json` (from the YGOPRODeck fan API); images are hotlinked from images.ygoprodeck.com by card id — never scrape the fandom wiki. Character portraits are original AI-generated art in `src/assets/characters/` imported by `src/data/catalog.ts`. Decks persist in `decks`/`deck_cards` (RLS by owner); deck rules (45 max, 3 copies) live in `src/lib/deck-rules.ts` with tests in `src/test/deck-rules.test.ts`.
- Live and landing-preview battlefields share `Battlefield3D` (R3F); DOM card controls stay in the main React root and receive per-frame projection matrices rather than Drei Html roots; render after hydration — avoids React 19 nested-root unmount races and preserves accessible inspection.
- `arena-presentation.ts` governs inspection privacy and ends turns through the existing reducer; hidden opponent identities never enter card inspectors or accessible names — presentation changes must not leak private cards or bypass rules.
- Three.js colors are resolved from global semantic CSS tokens through a canvas color conversion — Three.js cannot parse oklch directly.
- Dev-only arena verification exposes `window.__arena.state` and `.act(action)`; `[data-scene-ready="1"]` signals the first scene frame — allows deterministic rule-flow checks without relying on software-GPU timing.
- Online rooms: `duel_rooms` row holds the whole DuelState as jsonb; the active player writes it and both clients follow via Realtime; joining goes through the `join_duel_room` security-definer RPC; codes are 6 chars (`src/lib/online-room.ts`) and any non-code roomId stays a local/training duel.
