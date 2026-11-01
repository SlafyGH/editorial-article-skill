# Repository map

## Installed skill

- `skills/editorial-article/SKILL.md`: provider-neutral entrypoint.
- `agents/openai.yaml`: Codex UI metadata; automatic discovery stays enabled.
- `scripts/render_article.py`: brief-to-HTML renderer with escaped text and safe local output.
- `scripts/check_article.py`: structural/offline-reference checks, not a browser audit.
- `scripts/embed_site.mjs`: puts a rendered article inside a host site (scoped CSS on the host's tokens, content JSON per language); run from the host root.
- `references/site-embed.md`: host embedding steps, tokens file, pitfalls.
- `assets/examples/site-tokens.e4b.json`, `CaseStudyArticle.tsx`, `case-study-page.tsx`: E4B tokens and the Next.js mounting templates.
- `references/design.md`: approved layout, typography, motion and image direction.
- `references/writing-publication.md`: evidence, author-led writing with AI edits, tone, translation and public-safety rules.
- `references/content-schema.md`: optional renderer format and component limits.
- `references/inspirations.md`: credited references and provenance.
- `references/interactive-patterns.md` + `assets/patterns/service-bento/`: inspiration bank for interactive parts (live mini-UI scenes from eforb.pl, React source to port, rules: one scene in focus at a time).
- `assets/shared/`: CSS, JS, fonts, icons, licenses and example cover; `figures.css`/`figures.js` hold the database drawing, try-it chat, dot matrix, conveyor drawing and the n8n-style workflow runner.
- `assets/examples/rag-brief.json` (RAG, search and chat) and `assets/examples/automations-brief.json` (n8n automations, conveyor and runner; engine not bundled): approved case-study briefs, the reference for new articles.
- `assets/example/`: Kacper's final EN/PL article and desktop/mobile previews.
- `assets/brief.example.json`: fictional queue brief for a reusable-components demo.

## Repository-only files

- `README.md`: installation, invocation and development commands.
- `LICENSE`, `THIRD_PARTY_NOTICES.md`: original-work and asset licenses.
- `AGENTS.md`: maintainer boundaries.
- `tests/test_renderer.py`: standard-library unit tests.
- `tests/browser.cjs`: Playwright behavior checks in both languages.
- `package.json`, `package-lock.json`: pinned development-only browser dependency.
- `docs/verification.md`: measured verification scope and limitations.

The installed skill does not depend on repository tests, docs, node_modules, or another skill. Generated pages need no CDN or npm runtime; a live demo may call a project backend over HTTPS. Ignored `artifacts/` contains only local QA screenshots.
