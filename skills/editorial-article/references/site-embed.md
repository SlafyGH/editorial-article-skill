# Publishing inside a host site

A case study must look like part of the site it is published on: the site's header, logo, menu,
footer, fonts, colours and light/dark switch, plus a way back to the list of projects. A
standalone HTML page next to the site reads as a separate product and was rejected (30.10.2026).

## Steps

1. **Render with absolute asset URLs.** The host serves the rendered folder as static files:

   ```sh
   python3 <skill>/scripts/render_article.py --brief brief.json --out public/realizacje/<slug> --base-url /realizacje/<slug>/
   ```

   The scripts find their icons and the runner engine next to themselves, so they work at any URL.

2. **Describe the host's design tokens** in a small JSON (example for E4B:
   `assets/examples/site-tokens.e4b.json`):
   - `light`: article tokens (`paper`, `ink`, `body`, `faint`, `card`, `accent`, `signal`, `tint`) as
     the host's own CSS variables, so the theme switch of the site recolours the article live.
     Leave out tokens the host already defines under the same name (`line`, `muted`), or the
     variable would refer to itself.
   - `dark.selector` and `dark.tokens`: how the host marks dark mode (`html[data-theme=dark]`,
     `.dark`, …) and what changes there.
   - `fonts`: the host's body, mono and display font stacks.
   - `headerOffset`: the height of a sticky host header, in px, for anchors and the contents rail.
   Read the host's global CSS for the real names; never guess.

3. **Generate content and scoped CSS** from the host project root (postcss comes from the host):

   ```sh
   node <skill>/scripts/embed_site.mjs --from public/realizacje/<slug> --content src/content/case-studies/<slug> --css src/components/CaseStudyArticle.css --tokens site-tokens.json
   ```

   Every rule ends up under `.ea`; the article's `:root`/`body` rules become the wrapper; the
   article's own colour declarations are dropped in favour of the host bridge. One CSS file serves
   every case study, because the article styles are shared.

4. **Mount it in a host route.** For Next.js copy `assets/examples/CaseStudyArticle.tsx` and
   `assets/examples/case-study-page.tsx`; adapt the layout wrapper, language hook and storage key
   to the host. The component injects checked-in markup only (never CMS or user HTML), adds the
   `article-data` JSON with `textContent`, then loads `article.js` and `figures.js` once. The page
   gives a "← All projects" link on top and "Back to projects" plus a contact link at the bottom.

5. **Link to it with a plain `<a>`, not a client-side router link.** The article scripts bind to
   the page once; a client-side remount would add the scroll listeners twice.

6. **Redirect the raw HTML** (`/realizacje/<slug>/{pl,index}.html`) to the site route, so there is
   one public address. Keep the files: they are the generator's input.

## Pitfalls seen in practice

- **A global class of the host with the same name.** E4B's `.reveal{opacity:0}` hid every article
  section; the bridge forces `.ea .reveal:not(.pending)` visible. After embedding, check that the
  body text is visible, not just that the page loads.
- **Language switching.** A site that keeps the language in client state reports its server
  default during hydration. Read the stored choice when mounting, and reload the page only when
  the user changes the language afterwards; otherwise the page reloads in a loop.
- **The lint of the host** may crash on the minified runner engine; ignore `public/realizacje/`.
- **A sticky host header** covers anchored headings unless `headerOffset` is set.

## Verify on the host

Desktop and phone (390 px, `is_mobile`), light and dark: header and footer present, body text
visible, no horizontal scroll, no console errors, figures run, the language switch swaps the text,
the back link leads to the projects list. Then the host's own build, lint and type check.
