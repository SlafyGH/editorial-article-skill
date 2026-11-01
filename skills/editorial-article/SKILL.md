---
name: editorial-article
description: Create or refine HTML project articles and case studies (E4B "Realizacje", portfolio) in the included centered editorial style - prose first, plus auto-animated drawings, a try-it chat with a behind-the-scenes panel, dot-matrix results, glossary terms and author profiles. Repo reading, from-zero explanation, interview, writing, cover, in-browser try-it built from the project's own code, embedding into the host site's header, footer, fonts and theme, review and publishing. Use when a project in the current repository needs a blog post or case study; not for landing pages.
license: MIT
---

# Editorial Article

Create a public-facing account of how a project works or how a problem was solved. The approved visual reference is Kacper's article in `assets/example/index.html`, with a Polish counterpart in `assets/example/pl.html`. Its subject, author and social URL are example content, not defaults for other projects.

## How the work goes, end to end

Talk to the author plainly and to the point: complete, but no padding and no overengineering. The skill is dropped into a project repository; the agent does the legwork and the author decides.

1. **Read the project first.** Scan the repository (README, docs, code, tests, benchmarks, examples). Large repositories: split the reading across parallel read-only helpers. Keep a private fact ledger before asking anything.
2. **Explain the system back, from zero.** Write the author a plain explanation of how it works (problem, parts, what happens step by step, measured results, limits). Agree which parts the article shows before designing any figure.
3. **Interview.** Ask about everything the repository cannot answer: audience, the main idea, what the reader must understand, which parts to show, what may not be published, author name and profiles, whether the text is written by the author or drafted by the agent in the author's voice. A few questions at a time, as many as needed.
4. **Write.** By default the author writes and AI edits. When the author asks the agent to write, draft in the author's voice (first person when requested), from the ledger and interview only, set `"ai_role": "drafted"` so the footer says so, and run the `humanizer` skill over the text when it is available. No dashes in Polish prose when the host site forbids them.
5. **Build the try-it part from the real thing.** Run the project's own code in the browser when it can (the automations article runs the original n8n Code nodes through a small engine and checks every example against the author's expected results), or call the project's backend. Never fake a result the system would not produce; label pre-recorded examples.
6. **Cover.** Use a supplied image, or generate one with `/generate` (quote the cost, wait for yes). Without that skill, give the author a prompt for Gemini or ChatGPT and remove the Gemini star from the bottom-right corner of the returned file.
7. **Render, embed, verify.** Render the article, then put it inside the host site with [site-embed.md](references/site-embed.md) so it carries the site's header, footer, logo, fonts, colours and theme, with a link back to the projects list. Verify in a real browser on desktop and phone, both themes.
8. **Review before going live.** For a public site, have a fresh read-only reviewer check the change for security (XSS paths, secrets or private hosts in the content, redirects, cost exposure of any live demo). Reviewers never print env values, only variable names. Fix findings before deploying.
9. **Ask one short question: "Publikować na stronę? (tak/nie)".** Only after "tak": commit, push, deploy the way the host deploys (check that a push really deploys; some hosts need a CLI deploy), then open the live URL and check it again. If the deploy would also ship other people's unreviewed changes waiting on the main branch, say so and ask first.
10. **Knowledge base (optional).** When the project has a RAG or another knowledge base for its site chat, add one short, public-safe description of the case study with a link to the live page, through the base's normal draft and approval flow, and check that its search finds it.

## Establish the article

Use the supplied brief, project evidence and publication constraints. Ask only for facts or choices that materially change the result: missing author identity, a social URL, confidential/public scope, or an unavailable required image. Never guess a profile URL or turn a planned feature into a completed one.

Read [design.md](references/design.md) and [writing-publication.md](references/writing-publication.md). For extra interactive parts (live mini-UI scenes and similar), see [interactive-patterns.md](references/interactive-patterns.md). For provenance and visual research, read [inspirations.md](references/inspirations.md); those links belong in development notes, not automatically in the public article.

Default to English `index.html` and a fully translated Polish `pl.html`, sharing local assets. Keep both languages without a visible language switcher. Respect a requested single language or another explicit design change.

## Keep the author in charge of the text

The article remains the author's work. The author owns the conception, the section order and the descriptions, and most of the prose is written by hand; AI corrects and advises rather than ghostwrites. It may fix grammar, spelling and translation, suggest what to add, cut or reorder, and flag unsupported or unclear claims. Draft new sections only at the author's request and from their notes, apply suggested additions only on the author's acceptance, and keep the author's structure and voice when editing. If the material contains no author-owned draft or notes, ask for them, or ask whether the author wants the agent to draft (step 4).

Every public article states this relationship plainly in the footer: "Corrected by AI, not fully written." Keep the label in both languages. If a future article is fully machine-written, the footer must say that instead — never present AI-written prose as the author's own writing.

## Build from the approved design

Use `assets/shared/article.css` and `article.js` rather than inventing a new visual world. Keep the white full-page surface, centered title, restrained metadata, rounded subject-relevant cover, narrow reading column and optional quiet contents rail. A standalone article has no navigation top bar, wordmark, menu, feature-summary strip, repository footer or print control; an article published inside a site takes the site's own header and footer instead (see step 7). The fixed 2 px reading-progress hairline at the top edge is part of the design; keep it indicator-only.

The dependency-free helper renders a brief into a portable article:

```sh
python3 "<skill-directory>/scripts/render_article.py" --brief "<brief.json>" --out "<new-output-directory>" [--base-url /realizacje/<slug>/]
```

On Windows, `py -3` can replace `python3`. Resolve the skill directory from this SKILL.md, not from a hard-coded machine path. Read [content-schema.md](references/content-schema.md) before preparing the brief. The helper refuses existing output directories.

Follow the approved case-study shape in [design.md](references/design.md) (section "Approved case-study shape"): problem in prose, one auto-animated drawing of the real component, mechanism in prose with glossary terms, a try-it chat with a behind-the-scenes panel, results as a dot matrix, then graph, model chips and FAQ. Demand as little as possible from the reader: scroll or automatic animation; clicks and hover only reveal optional detail. The reference builds are `assets/examples/rag-brief.json` (search and chat) and `assets/examples/automations-brief.json` (process automations: `conveyor` drawing and the n8n-style `runner`). Do not use the click-through `pipeline` (tabs, Next/Play) in new articles; it was rejected as filler. The `runner` needs the project's own engine folder (`runner_engine` in the brief: `n8n-mini.bundle.js` and `workflows.js`); clean exported workflows of instance IDs, webhook IDs and private hosts before bundling. Use the full example for custom HTML components outside the helper's compact schema; keep its accessibility and offline behavior.

When the article discusses specific AI models or vendors, use the bundled brand icons (`brand-*.svg`: OpenAI, Google Gemini, Anthropic, Meta, Mistral AI, Hugging Face, Ollama) and the renderer's `models` block, so pages do not stay text-only. Each chip links to the vendor's own official page (blog, documentation, model card) that you verified. Logos are trademarks for identification; they never imply endorsement or partnership.

Use an authorized supplied cover, or generate a subject-specific image with `/generate` when that skill is available (quote the cost first). Without it, give the author a ready prompt for Gemini or ChatGPT; when the file comes back from Gemini, crop or remove the star watermark in the bottom-right corner before using it. Label generated imagery. Do not reuse the example's paper brain for unrelated topics.

The author panel uses provided social URLs and icon-only links. Hover or focus opens it; pointer exit gets a 200 ms grace period, entry into the panel cancels closing, click pins it, Escape and outside click dismiss it. Keep keyboard and touch access. Without profiles, show the author as plain text.

Keep interface feedback brief. Explanatory animations may loop slowly once their figure is on screen. Preserve reduced-motion support and visible content when JavaScript is disabled. Bundle fonts, icons and their licenses; no CDNs or remote requests are needed to read the article. Live demos may use a real backend (HTTPS endpoint, keys only on the server, rate and cost limits chosen per project); the offline copy keeps the text and drops the live parts.

## Verify and hand off

Run the local check:

```sh
python3 "<skill-directory>/scripts/check_article.py" "<output-directory>"
```

This checks structure and local references, not visual quality or runtime behavior. When a browser is available, inspect desktop and mobile together and exercise the components actually used: tabs, playback, glossary, graph, FAQ, author hover handoff and reduced motion. Fix concrete defects in one batch, then confirm once. If browser verification is unavailable, say so.

Compare languages for factual parity, including diagrams, labels, captions and tooltips. Scan for credentials, private hosts/paths, unsupported metrics and leftover example content. Keep source evidence and inspiration notes separate from public output unless the user requests citations.

Return the output location and checks performed, then ask the publish question (step 9). Publishing, creating repositories, changing production systems or installing globally happens only after the author's explicit yes.
