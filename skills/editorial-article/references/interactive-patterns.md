# Interactive patterns: inspiration bank

Ideas for interactive parts of an article, beyond the drawings, try-it chat and dot matrix in [design.md](design.md). Use one only when it explains something the prose cannot. These are inspirations, not required blocks.

## Live mini-UI scenes ("service bento")

**What it is.** A small, hand-built mock interface that plays one short story in a loop. White or dark floating cards with soft shadows, small icons, badges and pills, connected by thin lines. The scene shows what a process does, not a screenshot of a real product.

**Reference.** A dental SaaS marketing site (screenshots supplied by the user on 01.11.2026, not redistributed). It had a segmented pill toggle with two tabs. Under it sat one rounded container split by hairline dividers into a bento grid. Each cell had a title, a two-line description and one animated scene. Scenes in the reference:

- a call answered (pulsing waveform), then Listening ↔ Understanding ↔ Booking steps, then a "Booking confirmed" card;
- a follow-up message card with an avatar, a badge and a "Message sent automatically" toast;
- a schedule with a segmented progress bar, an "AI recommendation, ready to review" row, and Reject/Approve buttons with a cursor clicking Approve;
- a booking page in browser chrome with a calendar grid, time slots and a floating colour and font picker;
- a rising line chart with floating stat cards;
- a fanned stack of review cards with "request sent" toasts;
- search-query chips → a document skeleton with an AI cursor clicking Publish → a search-result card, joined by connector lines.

**Our implementation.** [assets/patterns/service-bento/](../assets/patterns/service-bento/). React and plain CSS, written for eforb.pl on 01.11.2026, commit 3f9a223 in SlafyGH/excellent-for-business. It has 12 scenes, among them:

- a call answered by a voice agent, then a note in the panel;
- an answer with a cited source, then an honest "I don't know";
- an inbox summary with a reply draft sent after approval;
- a call transcript turned into a summary;
- invoice fields checked by rules, with statuses "accepted" and "needs fixing";
- an invoice compared with an order;
- an approval request;
- a webhook fanning out to a CRM, a sheet and e-mail;
- a camera zone alarm with a description from a local model;
- an operator rejecting an alarm;
- a weekly report chart;
- four data sources merging into one chart.

What it already handles:

- **Motion only when it can be seen.** A `data-motion` / `data-live` gate (IntersectionObserver plus `visibilitychange`) runs scenes only on screen. With reduced motion every scene shows its final state.
- **Fit to the cell.** Scenes scale to the cell width (`--z`), and wide ones pan with the story instead of shrinking.
- **Accessibility.** Keyboard tablist (arrow keys, Home, End). Mask gradients fade scenes at the cell edges.

Port it into the article runtime (plain HTML, CSS and JS). Do not ship React into an article.

## What the user decided

On eforb.pl, a whole grid of these playing at once was rolled back the same evening, because there were too many animations and it was unclear where to look. Kacper kept them as blog material. For articles:

- **One scene in focus at a time.** Play a scene when the reader hovers it, taps it, or it reaches the middle of the viewport. Every other scene rests on a clear static frame.
- **Never a wall of loops.** Use at most one or two scenes per section, beside the paragraph they illustrate.
- **No hover lift or parallax on cells.** The user removed both.
- **Honest sample data.** Use neutral sample values ("FV/2026/114", "Tomorrow, 10:30"), never invented KPIs, clients or percentages. Add one line: "The illustrations show sample data." Each scene must match what the project really does: check it against the source, the same as the article text.
- **Respect the host site.** Use the host site's colour tokens and fonts, not the reference's blue.

## Other ideas worth trying

- **Tab toggle that swaps one scene.** One cell with a segmented control, for comparing "before / after" or two modes of the same process.
- **Scrubbable story.** A range slider or step buttons that move one scene through its states, so the reader controls the pace (good for multi-step pipelines).
- **Stacked cards.** Stacked or fanned cards for queues: alarms, reviews, documents to check.
