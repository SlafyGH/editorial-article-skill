# Renderer brief

The helper uses a small JSON format to reuse the design and interactions. It does not research facts, translate copy or generate imagery. The agent supplies completed content.

## Document

```json
{
  "date": "2026-10-10",
  "project": "Example project",
  "author": {
    "name": "Author supplied by the user",
    "profiles": [
      {"name": "GitHub", "url": "https://github.com/", "icon": "github-logo"}
    ]
  },
  "languages": {
    "en": {
      "title": "A concrete article title",
      "subtitle": "A short description of what this article explains.",
      "category": "Project notes",
      "glossary": {},
      "sections": [
        {"id": "decision", "title": "The decision", "blocks": [
          {"type": "paragraph", "text": "Verified project information goes here."}
        ]}
      ]
    },
    "pl": {
      "title": "Konkretny tytuł artykułu",
      "subtitle": "Krótki opis tego, co wyjaśnia artykuł.",
      "category": "Notatki projektowe",
      "glossary": {},
      "sections": [
        {"id": "decision", "title": "Decyzja", "blocks": [
          {"type": "paragraph", "text": "Tutaj trafiają potwierdzone informacje o projekcie."}
        ]}
      ]
    }
  }
}
```

This is syntax documentation, not publishable project evidence. Replace its text. Profiles are optional; no supplied profiles means a plain author name. English becomes `index.html` when present; a Polish counterpart becomes `pl.html`. A Polish-only brief becomes `index.html` in Polish.

The optional root `cover` is `{"path":"local-image.png","generated":true}`. Relative paths resolve beside the brief, not against the shell's working directory. Every language then needs `cover_alt`; `cover_caption` is optional. The image is copied into output. The renderer never downloads it or automatically uses the paper-brain example.

Use optional `title_lines` to prescribe a desktop title break without forcing a mobile break. Keep the unbroken `title` for metadata. Section `toc` can provide a shorter contents label.

## Text and glossary

Text is escaped. Backticks render inline code. `[term:key|Visible label]` renders a glossary button, and must reference a glossary entry:

```json
{"sqlite":{"title":"SQLite","text":"The explanation written for this article.","icon":"database"}}
```

No raw HTML is accepted in text. For bespoke markup, edit generated HTML deliberately, then validate it. JSON inside HTML is escaped so text cannot close the data script.

## Blocks

| Type | Fields |
| --- | --- |
| paragraph, lead, note | `text` |
| heading | `text` (an h3) |
| callout | `text`, optional `icon` |
| summary | `items: [{label,text}]` |
| connections | `items: [{label,text}]` |
| layers | `items: [{label,title,text,icon}]` |
| comparison | Exactly two `items: [{title,text,caption,icon}]` |
| faq | `items: [{question,answer}]` |
| models | One to eight `items: [{model,icon,url}]`, optional `note` per item; see below |
| lifecycle | `items: [{label,icon,highlight}]`, optional `caption` |
| pipeline | `title`, `caption`, `flows` below (legacy; not for new articles) |
| database | `title`, `caption`, `engine:{name,tip}`, two to five `zones:[{look,label,tip,items?,badge?,hit?}]`; `look` is `docs`, `versions`, `segments` or `vectors` |
| askchat | `title`, `caption`, `side_title`, `placeholder`, `disclosure`, `refuse`, `docs:[{id,title,text}]`, one to four `examples`, six `steps`; see below |
| dotmatrix | `title`, `caption`, three `outcomes:[{id,label}]`, `items` (question texts), `series:[{label,values,highlight}]` |
| graph | `title`, `caption`, `nodes`, `edges` below |
| conveyor | `title`, `caption`, three to seven `stations:[{icon,label,tip,stamps?}]`, `stamps:[{label,tone}]` (`tone`: ok, human, bad, seen); see below |
| runner | `title`, `caption`, `text` (UI strings), `workflows:[{id,label,text,fields,status_field?,upload?,accept?}]`; needs root `runner_engine`; see below |

All text fields represent the new project's supplied facts. Icons use bundled filenames without `.svg`, e.g. `database`, `file-text`, `robot`, `stack`, `plugs-connected`, `shield-check`, `github-logo`, `arrow-right`, `arrow-down`. Inspect `assets/shared/icons/` for the full available set rather than assuming an icon name. Unknown icons fail validation.

## Interactive process

```json
{
  "type":"pipeline", "title":"A process", "caption":"Illustrative explanation, not live telemetry.",
  "flows":{
    "save":{"label":"Save", "steps":[
      {"title":"Receive", "code":"optional code label", "heading":"What happens here", "text":"The actual explanation.", "icon":"tray"},
      {"title":"Store", "heading":"Next operation", "text":"Its explanation.", "icon":"database"}
    ]}
  }
}
```

One pipeline per article, one to three flows, two to eight steps per flow. These are helper limits, not universal writing rules. Split a larger explanation or author custom HTML. Each step's title, heading and description must be translated. The runtime preserves step-button DOM between selections and supports keyboard tabs and playback.

## Relationship graph

```json
{
  "type":"graph", "title":"Relationships", "caption":"Sample data.",
  "nodes":[
    {"id":"project","title":"Project","text":"Meaning of this node.","x":330,"y":150},
    {"id":"decision","title":"Decision","text":"Meaning of its relationship.","x":120,"y":70}
  ],
  "edges":[{"from":"project","to":"decision","kind":"link"}]
}
```

One graph per article, two to twelve nodes, unique identifiers. Edges refer to existing node IDs. `kind` is `link` or `group`; these are explicit relationships versus grouping, not causal proof. Coordinates are optional; omitted positions use a radial explanatory layout. Provide positions when that structure would misrepresent the subject.

## Try-it chat and results

`askchat` renders the host site's assistant plus a steps panel. Each example is `{q, answer, check, refused, sources, e5, bm25, final}`: the three rankings are document ids from a real measurement, `sources` are cited ids, `refused: true` shows the refusal path. Steps in order: `vec` (`thinking`), `e5` (`local`, shown for typed questions), `bm25`, `final`, `check` (`ok`, `none`), `answer` (`ok`, `refused`). A typed question is ranked in the browser with BM25 over `docs`. Answer words may end with `[1]` citations.

`dotmatrix` values are outcome ids per item, in item order (for example rank 1 → `first`, rank ≤ 5 → `top`, otherwise `miss`). The renderer computes the totals; check them against the source measurement.

The full reference brief is `assets/examples/rag-brief.json`.

## Conveyor and workflow runner

`conveyor` is the drawing for a process that every item passes in the same order (automations, pipelines). Stations are pictograms on a dashed line; paper sheets travel along it and the station with `"stamps": true` cycles the given status stamps. Each station explains itself on hover.

`runner` runs real n8n workflows in the reader's browser and draws them like the n8n canvas: the exported node positions, icons per node type, connections with item counts, success marks and loop counters. The list of workflows sits on the left. The first workflow's sample runs instantly when the figure comes into view; "Run the sample" replays the real execution order with the camera following the active node, and a second click reuses the registry, so already handled documents show up as such. Readers can upload their own files (they never leave the browser), zoom with the wheel only over the canvas and drag to pan. The report file appears on the canvas for download.

Root `runner_engine` is a directory (relative to the brief) with `n8n-mini.bundle.js` (the browser runtime exposing `window.N8nMini`) and `workflows.js` (`window.N8N_WORKFLOWS = {id: workflowJson}`); the renderer copies both into `assets/runner/` and the page loads them lazily. Strip instance IDs, version IDs, webhook IDs and data table IDs from public workflow exports first. `fields` name the row columns that label an item; `status_field` defaults to `status`; `upload: false` hides uploads (for example a monitor that needs the network). The automations reference build is `assets/examples/automations-brief.json`; its engine is not bundled with the skill.

## Model references

When the article names specific AI models or vendors, a `models` block renders quiet chips: a bundled brand logo, the model name and an optional vendor note, each linking to that vendor's own official page (blog post, documentation or model card).

```json
{"type":"models","items":[
  {"model":"GPT","icon":"brand-openai","note":"OpenAI","url":"https://openai.com/"},
  {"model":"Claude","icon":"brand-anthropic","note":"Anthropic","url":"https://www.anthropic.com/claude"}
]}
```

Rules: HTTPS-only vendor URLs without credentials; brand icons are the `brand-*` files in `assets/shared/icons/` (currently OpenAI, Google Gemini, Anthropic, Meta, Mistral AI, Hugging Face, Ollama); logos are trademarks used to identify the vendor, never to imply endorsement or partnership. Only link a page you actually verified. The structural checker treats chip links like author-panel links: pre-reviewed, so it reports other external links for publication review.

## Scope

The renderer refuses existing output directories and stages the new output before copying it. It never publishes, installs skills, changes a project backend or writes to Brain. Structural validation is separate from browser testing and fact checking.
