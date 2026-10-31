# Design reference

The bundled example is the final approved state, not the earlier iterations with a header and language pill.

## Composition

- Full white canvas; no rounded page container or dark surround.
- A centered, balanced title above a compact introduction and metadata.
- Desktop cover/hero width up to 970 px, image ratio around 2.15:1 and 24 px image radius. Mobile cover ratio around 1.6:1 with an 18 px radius. The image can change; the page is not a brain-themed template.
- Reading layout: a quiet 150 px contents rail, 54 px gap and a text column up to 720 px. On phones the contents rail becomes a horizontally scrollable strip.
- A 3 px reading-progress hairline is fixed to the top edge and fills with the read portion. It carries a visible track (`--line`) and a soft sage gradient fill that starts light and deepens toward the accent, so it reads as part of the palette instead of a black overlay. It is an indicator, not navigation: no menu, wordmark or links live in it, and it does not print.
- Generous section spacing, but tighter grouping of explanations and their diagrams. Keep code names and technical labels where informative, not as decoration.

## Approved case-study shape

Accepted by Kacper on 30.10.2026 (RAG article, `assets/examples/rag-brief.json`). Earlier attempts (product-page sections, click-through steps, tile boards, pills) were rejected as slop or as not looking like a blog.

1. **Problem: prose only.** Lead plus two or three paragraphs: what goes wrong without the project, what the idea is, what this text covers. No figure.
2. **Where it lives: one drawing** (`database` block, or custom HTML in the same visual language). Draw the real component as a pictogram: a database is a can labelled PostgreSQL, its parts are drawers with tiny paper cards, version stacks, fragment strips and vector bars. It animates by itself once on screen and loops slowly along the path of one item. Every part explains itself on hover or tap; the figure carries almost no text.
3. **Mechanism: prose with glossary terms.** Steps such as drafting, approval and access control are paragraphs; unfamiliar words are `[term:...]` hovers. No step tabs.
4. **Try it: the host site's own chat** (`askchat`). A copy of the site's assistant (same bubbles, orb, composer, disclosure) with two or three suggested questions, one of which shows a refusal or limit. Beside it, "Co się dzieje w środku" lights the system's steps one by one with real rankings. The first example runs automatically when the figure comes into view. One line says what is recorded and what runs live.
5. **Results: a dot matrix** (`dotmatrix`), one row per method and one dot per test question; hover names the question. Then two sentences of conclusions and one short caveat. No bar charts or tile boards.
6. **Graph, model chips (brand-coloured logos), FAQ.**

For automations and other step-by-step processes the same shape uses a `conveyor` drawing in step 2 and a `runner` in step 4: the real workflows drawn like the n8n canvas, run in the browser on the original code, the first one shown already finished, with no results table below it (the report is a download). Accepted on 30.10.2026 for Wiktor's eleven n8n automations.

Never in a public case study: admin panels or internal tooling, "what is left to do", "not deployed yet", local paths or test-machine detail. The reader is a client first; the language is simple but stays technical.

## Tokens

The exact definitions are in `assets/shared/article.css`.

| Role | Value |
| --- | --- |
| Paper | `#ffffff` |
| Text | `#202723` |
| Secondary text | `#5e6861` |
| Soft surface | `#f5f7f5` |
| Divider | `#dfe5df` |
| Accent | `#235b47` |
| Soft accent | `#eaf2ec` |
| Typeface | Locally bundled Geist variable |
| Icon family | Locally bundled Phosphor regular, plus monochrome `brand-*` logos (Simple Icons, CC0; trademarks stay with their owners) |

Use the included CSS as visual authority. Do not substitute a generic card dashboard, gradient heading, decorative grid background or oversized brand navigation.

## Motion and interaction

Routine feedback is around 150–160 ms, usually a 1–2 px move or a small icon rotation. Text never waits offscreen at opacity zero. Explanatory drawings start when they enter the viewport and may loop slowly; nothing loops only for decoration. Respect `prefers-reduced-motion`.

Pipelines preserve their button DOM while changing steps, so keyboard focus survives. Process length follows the explanation, not a universal six-step requirement. FAQ opens one item at a time. A graph is explanatory unless actual instrumentation is supplied.

The progress hairline updates from scroll position through `requestAnimationFrame`, without timers, loops or scroll-jacking; under `prefers-reduced-motion` it moves without transition. It stays decorative (`aria-hidden`), since the position in the page already carries the information.

FAQ items expand and collapse smoothly: `interpolate-size: allow-keywords` plus a `::details-content` block-size transition (~250 ms) animates the switch between one open item and another. Browsers without that support fall back to instant toggling; content is never hidden permanently.

Author profiles use 44 px targets and provided HTTPS URLs. The hover panel has a 200 ms closing delay and supports moving from the name into the panel. Keep focus return on Escape and a touch/click alternative.

## Image direction

The original cover uses a tactile paper-brain metaphor and connected note cards on a muted cyan surface. That is evidence of what worked for memory, not a subject to reproduce everywhere. For a new topic, prefer one legible visual relationship, physical materials, quiet lighting and no lettering. Avoid pretending a generated image is an actual photograph of the project.

Do not ship new header branding or a visible language switcher unless explicitly requested. The author's later request removed both.
