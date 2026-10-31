#!/usr/bin/env python3
"""Render a trusted article brief with local assets. Python standard library only."""
import argparse
import datetime
import html
import json
import math
import re
import shutil
import tempfile
from pathlib import Path
from urllib.parse import urlsplit

SKILL = Path(__file__).resolve().parents[1]
SHARED = SKILL / "assets" / "shared"
SLUG = re.compile(r"^[a-z][a-z0-9-]*$")
INLINE = re.compile(r"(`[^`]+`|\[term:([a-z][a-z0-9-]*)\|([^\]]+)\])")
LABELS = {
    "en": dict(skip="Skip to the article", published="Published", author="Written by:", project="Project", reading="Reading time", contents="In this article", play="Play", pause="Pause", next="Next", choose="Choose a process", steps="Process steps", generated="Generated image", all="All", links="Links", groups="Groups", graph="Sample relationship graph. Select a node for its explanation.", select="Select", profiles="Author profiles", authorDescription="Author of this article.", back="Back to top", offline="This article works offline.", aiNote="Corrected by AI, not fully written.", aiDrafted="Drafted with AI from project documentation; the author reviews and approves it.", conversation="Conversation", ask="Ask", demoEmpty="Type a question or pick an example.", refused="Refused", answered="Answered", liveDemo="Live demo", localDemo="Runs in your browser", of="of", offlineDemo="The article reads offline; the live demo needs a connection."),
    "pl": dict(skip="Przejdź do artykułu", published="Publikacja", author="Napisane przez:", project="Projekt", reading="Czas czytania", contents="W tym artykule", play="Odtwórz", pause="Pauza", next="Dalej", choose="Wybierz proces", steps="Kroki procesu", generated="Obraz wygenerowany", all="Wszystkie", links="Odwołania", groups="Grupy", graph="Przykładowy graf relacji. Wybierz węzeł, aby przeczytać wyjaśnienie.", select="Wybierz", profiles="Profile autora", authorDescription="Autor tego artykułu.", back="Wróć na początek", offline="Artykuł działa offline.", aiNote="Poprawione przez AI, nie napisane w całości.", aiDrafted="Szkic przygotowany z AI na podstawie dokumentacji projektu; autor go poprawia i zatwierdza.", conversation="Rozmowa", ask="Zapytaj", demoEmpty="Wpisz pytanie albo wybierz przykład.", refused="Odmowa", answered="Odpowiedź", liveDemo="Demo na żywo", localDemo="Działa w przeglądarce", of="z", offlineDemo="Artykuł czyta się offline; demo na żywo wymaga połączenia."),
}

def esc(value):
    return html.escape(str(value), quote=True)

def required(obj, key):
    value = obj.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"Expected nonempty text: {key}")
    return value

def slug(value):
    if not isinstance(value, str) or not SLUG.fullmatch(value):
        raise ValueError(f"Invalid identifier: {value!r}")
    return value

def icon_name(value):
    slug(value)
    if not (SHARED / "icons" / (value + ".svg")).is_file():
        raise ValueError(f"Unknown bundled icon: {value}")
    return value

def icon(value, class_name="icon"):
    return f'<img class="{class_name}" src="assets/icons/{icon_name(value)}.svg" width="20" height="20" alt="" aria-hidden="true">'

def rich(value, glossary):
    if not isinstance(value, str):
        raise ValueError("Rich text must be a string")
    result, cursor = [], 0
    for match in INLINE.finditer(value):
        result.append(esc(value[cursor:match.start()]))
        if match.group(2):
            key = match.group(2)
            if key not in glossary:
                raise ValueError(f"Undefined glossary term: {key}")
            result.append(f'<button class="term" data-term="{key}" type="button">{esc(match.group(3))}</button>')
        else:
            result.append("<code>" + esc(match.group(1)[1:-1]) + "</code>")
        cursor = match.end()
    result.append(esc(value[cursor:]))
    return "".join(result)

def profile_links(profiles, labels):
    result = []
    for profile in profiles:
        name = required(profile, "name")
        address = required(profile, "url")
        parsed = urlsplit(address)
        if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
            raise ValueError("Profile URLs must be HTTPS and must not contain credentials")
        result.append(f'<a href="{esc(address)}" target="_blank" rel="noopener noreferrer" aria-label="{esc(name)}" title="{esc(name)}">{icon(profile.get("icon", "link"), "icon profile-icon")}</a>')
    return "".join(result)

class Page:
    def __init__(self, language, content):
        self.labels = LABELS[language]
        self.glossary = content.get("glossary", {})
        self.payload = dict(ui=self.labels, glossary=self.glossary)
        for key, entry in self.glossary.items():
            slug(key); required(entry, "title"); required(entry, "text")
            if "icon" in entry:
                icon_name(entry["icon"])
        self.singletons = set()
        self.live = False

    def once(self, name):
        if name in self.singletons:
            raise ValueError(f"Only one {name} block per article; adapt custom HTML for more.")
        self.singletons.add(name)

    def card(self, card):
        rows = []
        for row in card.get("rows", []):
            mark = row.get("mark", "")
            if mark not in ("", "hit", "miss", "dim"):
                raise ValueError("Card row marks are hit, miss or dim.")
            rows.append(f'<li class="{mark}" data-key="{esc(required(row, "value"))}"><span>{esc(required(row, "label"))}</span><b>{esc(row["value"])}</b></li>')
        return f'<div class="step-card"><p>{esc(required(card, "title"))}</p><ul>{"".join(rows)}</ul></div>'

    def block(self, block):
        kind = block.get("type", "paragraph")
        r = lambda value: rich(value, self.glossary)
        if kind in ("paragraph", "lead", "note"):
            class_name = "" if kind == "paragraph" else f' class="{kind}"'
            return f'<p{class_name}>{r(required(block, "text"))}</p>'
        if kind == "heading":
            return f'<h3>{esc(required(block, "text"))}</h3>'
        if kind == "callout":
            return f'<div class="key-point">{icon(block.get("icon", "file-text"))}<p>{r(required(block, "text"))}</p></div>'
        if kind == "summary":
            return '<ul class="scan-list">' + "".join(f'<li><b>{esc(required(item, "label"))}</b><span>{r(required(item, "text"))}</span></li>' for item in block["items"]) + "</ul>"
        if kind == "connections":
            return '<dl class="connection-list">' + "".join(f'<div><dt>{esc(required(item, "label"))}</dt><dd>{r(required(item, "text"))}</dd></div>' for item in block["items"]) + "</dl>"
        if kind == "layers":
            rows = []
            for item in block["items"]:
                rows.append(f'<div class="layer">{icon(item.get("icon", "file-text"))}<div><small>{esc(item.get("label", ""))}</small><b>{esc(required(item, "title"))}</b></div><p>{r(required(item, "text"))}</p></div>')
            return '<div class="layers">' + "".join(rows) + "</div>"
        if kind == "comparison":
            if len(block["items"]) != 2:
                raise ValueError("Comparison blocks have two columns; use a list for more.")
            return '<div class="search-compare">' + "".join(f'<div class="search-track"><h3>{icon(item.get("icon", "file-text"))}{esc(required(item, "title"))}</h3><p>{r(required(item, "text"))}</p><small>{esc(item.get("caption", ""))}</small></div>' for item in block["items"]) + "</div>"
        if kind == "faq":
            return '<div class="facts">' + "".join(f'<details name="article-faq"><summary><span>{esc(required(item, "question"))}</span>{icon("caret-down")}</summary><p>{r(required(item, "answer"))}</p></details>' for item in block["items"]) + "</div>"
        if kind == "models":
            items = block["items"]
            if not 1 <= len(items) <= 8:
                raise ValueError("A models block needs one to eight chips.")
            chips = []
            for item in items:
                name = required(item, "model")
                address = required(item, "url")
                parsed = urlsplit(address)
                if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
                    raise ValueError("Model URLs must be HTTPS and must not contain credentials")
                note = item.get("note", "")
                chips.append(f'<a class="model-chip" href="{esc(address)}" target="_blank" rel="noopener noreferrer">{icon(item.get("icon", "link"))}<b>{esc(name)}</b>{f"<small>{esc(note)}</small>" if note else ""}</a>')
            return '<div class="models">' + "".join(chips) + "</div>"
        if kind == "lifecycle":
            states = []
            for item in block["items"]:
                class_name = "state proposed" if item.get("highlight") else "state"
                states.append(f'<span class="{class_name}">{icon(item.get("icon", "file-text"))}{esc(required(item, "label"))}</span>')
            return '<div class="lifecycle">' + icon("arrow-right", "state-arrow").join(states) + f'</div><p class="lifecycle-caption">{r(block.get("caption", ""))}</p>'
        if kind == "pipeline":
            self.once(kind)
            flows = block["flows"]
            if not 1 <= len(flows) <= 3:
                raise ValueError("A pipeline needs one to three flows.")
            tabs, fallback = [], []
            for number, (key, entry) in enumerate(flows.items()):
                slug(key); required(entry, "label")
                if not 2 <= len(entry["steps"]) <= 8:
                    raise ValueError("A flow needs two to eight steps.")
                for step in entry["steps"]:
                    required(step, "title"); required(step, "text")
                    step.setdefault("heading", step["title"])
                    step["icon"] = icon_name(step.get("icon", "file-text"))
                tabs.append(f'<button role="tab" id="tab-{key}" data-flow="{key}" aria-controls="pipeline-panel" aria-selected="{str(number == 0).lower()}" tabindex="{0 if number == 0 else -1}" type="button">{esc(entry["label"])}</button>')
                fallback.append(esc(entry["label"]) + ": " + " → ".join(esc(step["title"]) for step in entry["steps"]))
            first = next(iter(flows))
            self.payload["flows"] = flows
            return f'<figure class="wide-figure" id="pipeline" aria-labelledby="pipeline-title"><div class="figure-top"><span class="figure-label" id="pipeline-title">{icon("git-branch")}{esc(required(block, "title"))}</span><div class="tabs" role="tablist" aria-label="{esc(self.labels["choose"])}">{"".join(tabs)}</div></div><div id="pipeline-panel" role="tabpanel" aria-labelledby="tab-{first}"><ol class="rail" id="step-rail" aria-label="{esc(self.labels["steps"])}"></ol><div class="step-explainer" id="step-explainer" aria-live="polite" aria-atomic="true"></div></div><div class="figure-controls"><span class="step-count" id="step-count"></span><div class="control-group"><button class="control" id="next-step" type="button">{esc(self.labels["next"])} {icon("arrow-right")}</button><button class="control primary" id="play-flow" type="button" aria-pressed="false">{icon("play")}<span>{esc(self.labels["play"])}</span></button></div></div><figcaption class="diagram-caption">{r(required(block, "caption"))}</figcaption><noscript><p>{"<br>".join(fallback)}</p></noscript></figure>'
        if kind == "graph":
            self.once(kind)
            nodes = block["nodes"]
            if not 2 <= len(nodes) <= 24:
                raise ValueError("An explanatory graph needs two to twenty-four nodes.")
            by_id = {}
            for index, node in enumerate(nodes):
                key = slug(node["id"])
                if key in by_id:
                    raise ValueError("Duplicate graph node identifier")
                required(node, "title"); required(node, "text")
                angle = 2 * math.pi * (index - 1) / max(1, len(nodes) - 1)
                node.setdefault("x", 330 if index == 0 else round(330 + 240 * math.cos(angle)))
                node.setdefault("y", 150 if index == 0 else round(150 + 100 * math.sin(angle)))
                if not (math.isfinite(node["x"]) and math.isfinite(node["y"]) and 8 <= node["x"] <= 652 and 8 <= node["y"] <= 266):
                    raise ValueError("Graph coordinates must stay inside the drawing")
                by_id[key] = node
            edges = []
            for edge in block["edges"]:
                start, end = by_id[edge["from"]], by_id[edge["to"]]
                edge_kind = edge.get("kind", "link")
                if edge_kind not in ("link", "group"):
                    raise ValueError("Graph edge kinds are link or group.")
                class_name = "folder" if edge_kind == "group" else "link"
                edges.append(f'<line class="graph-edge {class_name}" data-a="{edge["from"]}" data-b="{edge["to"]}" x1="{start["x"]}" y1="{start["y"]}" x2="{end["x"]}" y2="{end["y"]}"/>')
            drawings = []
            for index, node in enumerate(nodes):
                x, y = node["x"], node["y"]
                anchor = "start" if x < 180 else "end" if x > 480 else "middle"
                drawings.append(f'<g class="graph-node{" selected folder" if index == 0 else ""}" data-node="{node["id"]}" tabindex="0" role="button" aria-label="{esc(self.labels["select"])} {esc(node["title"])}" aria-pressed="{str(index == 0).lower()}"><circle cx="{x}" cy="{y}" r="{16 if index == 0 else 9}"/><text x="{x}" y="{y + 27}" text-anchor="{anchor}">{esc(node["title"])}</text></g>')
            self.payload["graph"] = dict(nodes=nodes)
            first = nodes[0]
            filters = "".join(f'<button data-edge="{key}" type="button" aria-pressed="{str(key == "all").lower()}">{esc(self.labels[label])}</button>' for key, label in (("all", "all"), ("link", "links"), ("folder", "groups")))
            return f'<figure class="wide-figure graph-figure" aria-labelledby="graph-title"><div class="figure-top"><span class="figure-label" id="graph-title">{icon("tree-structure")}{esc(required(block, "title"))}</span><div class="graph-legend">{filters}</div></div><div class="graph-view"><svg viewBox="0 0 660 300" role="group" aria-label="{esc(self.labels["graph"])}">{"".join(edges)}{"".join(drawings)}</svg></div><div class="graph-detail" id="graph-detail" aria-live="polite" aria-atomic="true"><b>{esc(first["title"])}</b><p>{esc(first["text"])}</p></div><figcaption class="diagram-caption">{r(required(block, "caption"))}</figcaption></figure>'
        if kind == "scrolly":
            nodes, steps = block["nodes"], block["steps"]
            if not 2 <= len(nodes) <= 8 or not 2 <= len(steps) <= 10:
                raise ValueError("A scrolly figure needs two to eight nodes and two to ten steps.")
            ids = set()
            for node in nodes:
                ids.add(slug(node["id"])); required(node, "label"); icon_name(node.get("icon", "file-text"))
            track = "".join(f'<li class="sc-node" data-node="{node["id"]}"><span class="sc-disc">{icon(node.get("icon", "file-text"))}</span><span class="sc-label">{esc(node["label"])}</span></li>' for node in nodes)
            items = []
            for number, step in enumerate(steps):
                required(step, "title"); required(step, "text")
                focus = step.get("focus", [])
                if any(key not in ids for key in focus):
                    raise ValueError("Scrolly focus must name existing nodes.")
                card = self.card(step["card"]) if step.get("card") else ""
                items.append(f'<li class="sc-step" data-focus="{esc(" ".join(focus))}"><span class="sc-num">{number + 1:02d}</span><h3>{esc(step["title"])}</h3><p>{r(step["text"])}</p>{card}</li>')
            return f'<figure class="fig scrolly" data-scrolly><div class="sc-stage" aria-hidden="true"><div class="fig-head"><span class="fig-label">{esc(required(block, "title"))}</span><span class="sc-count"><b>01</b> / {len(steps):02d}</span></div><ol class="sc-track" style="--n:{len(nodes)}">{track}</ol><div class="sc-card"></div></div><ol class="sc-steps">{"".join(items)}</ol><figcaption class="fig-caption">{r(required(block, "caption"))}</figcaption></figure>'
        if kind == "replay":
            conversations = block["conversations"]
            if not 1 <= len(conversations) <= 4:
                raise ValueError("A replay needs one to four conversations.")
            parts, count = [], 0
            for index, conversation in enumerate(conversations):
                messages = []
                for message in conversation["messages"]:
                    role = message.get("role", "user")
                    if role not in ("user", "bot", "check"):
                        raise ValueError("Replay roles are user, bot or check.")
                    status = message.get("status", "")
                    if status not in ("", "answered", "refused"):
                        raise ValueError("Replay status is answered or refused.")
                    if role == "check":
                        body = f'{icon("shield-check")}<span>{esc(required(message, "text"))}</span>'
                    else:
                        sources = "".join(f'<span class="rp-source">[{n + 1}] {esc(source)}</span>' for n, source in enumerate(message.get("sources", [])))
                        badge = f'<span class="rp-status {status}">{esc(self.labels[status])}</span>' if status else ""
                        body = f'<p>{esc(required(message, "text"))}</p>' + (f'<div class="rp-meta">{badge}{sources}</div>' if badge or sources else "")
                    messages.append(f'<li class="rp-msg {role}" data-i="{count}">{body}</li>')
                    count += 1
                parts.append(f'<div class="rp-conv" data-conv="{index}"><p class="rp-title"><span>{esc(self.labels["conversation"])} {index + 1} {esc(self.labels["of"])} {len(conversations)}</span><b>{esc(required(conversation, "label"))}</b></p><ol class="rp-thread">{"".join(messages)}</ol></div>')
            dots = "".join("<i></i>" for _ in conversations)
            return f'<figure class="fig replay" data-replay style="--steps:{count}"><div class="rp-stage"><div class="fig-head"><span class="fig-label">{esc(required(block, "title"))}</span><span class="rp-dots">{dots}</span></div><div class="rp-window">{"".join(parts)}</div></div><figcaption class="fig-caption">{r(required(block, "caption"))}</figcaption></figure>'
        if kind == "scoreboard":
            outcomes, series, items = block["outcomes"], block["series"], block["items"]
            if len(outcomes) != 3 or not 2 <= len(series) <= 8 or not 4 <= len(items) <= 60:
                raise ValueError("A scoreboard needs three outcomes, two to eight series and four to sixty items.")
            outcome_ids = [slug(o["id"]) for o in outcomes]
            series_ids = []
            for entry in series:
                slug(entry["id"].replace("_", "-")); required(entry, "label"); required(entry, "text")
                series_ids.append(entry["id"])
            for item in items:
                required(item, "label")
                if set(item["values"]) != set(series_ids) or any(v not in outcome_ids for v in item["values"].values()):
                    raise ValueError("Scoreboard items need one declared outcome for every series.")
            first, second = outcome_ids[0], outcome_ids[1]
            totals = {key: {o: sum(1 for item in items if item["values"][key] == o) for o in outcome_ids} for key in series_ids}
            self.payload.setdefault("scoreboards", []).append(dict(series=series_ids, outcomes=outcome_ids, items=[item["values"] for item in items], totals=totals, labels=[entry["label"] for entry in series]))
            index = len(self.payload["scoreboards"]) - 1
            total = len(items)
            tiles = "".join(f'<li class="sb-tile" data-o="{item["values"][series_ids[0]]}" tabindex="0"><span>{n + 1:02d}</span><em>{esc(item["label"])}</em></li>' for n, item in enumerate(items))
            legend = "".join(f'<span class="sb-key" data-o="{o["id"]}"><i></i>{esc(required(o, "label"))}</span>' for o in outcomes)
            bars = "".join(f'<li data-s="{key}"><span>{esc(entry["label"])}</span><b class="sb-bar"><i class="a" style="--v:{totals[key][first] / total:.4f}"></i><i class="b" style="--v:{(totals[key][first] + totals[key][second]) / total:.4f}"></i></b><small>{totals[key][first]}<em>/{totals[key][first] + totals[key][second]}</em></small></li>' for key, entry in zip(series_ids, series))
            steps = "".join(f'<li class="sb-step" data-s="{key}"><span class="sc-num">{n + 1:02d}</span><h3>{esc(entry["label"])}</h3><p>{r(entry["text"])}</p></li>' for n, (key, entry) in enumerate(zip(series_ids, series)))
            start = totals[series_ids[0]]
            return f'<figure class="fig scoreboard" data-scoreboard="{index}"><div class="sb-stage"><div class="fig-head"><span class="fig-label">{esc(required(block, "title"))}</span><span class="sb-legend">{legend}</span></div><div class="sb-top"><p class="sb-name">{esc(series[0]["label"])}</p><div class="sb-big"><span class="sb-num" data-k="first">{start[first]}</span><small>/ {total}<br>{esc(outcomes[0]["label"])}</small></div><div class="sb-big ghost"><span class="sb-num" data-k="top">{start[first] + start[second]}</span><small>/ {total}<br>{esc(outcomes[1]["label"])}</small></div></div><ol class="sb-grid">{tiles}</ol><ol class="sb-bars">{bars}</ol></div><ol class="sb-steps">{steps}</ol><figcaption class="fig-caption">{r(required(block, "caption"))}</figcaption></figure>'
        if kind == "demo":
            if block.get("kind", "search") != "search":
                raise ValueError("Only the search demo kind is bundled; build other demos as custom HTML.")
            docs = block["documents"]
            if not 2 <= len(docs) <= 200:
                raise ValueError("A search demo needs two to two hundred documents.")
            for doc in docs:
                required(doc, "title"); required(doc, "text")
            endpoint = block.get("endpoint")
            if endpoint:
                parsed = urlsplit(required(endpoint, "url"))
                if parsed.scheme != "https" or not parsed.hostname or parsed.username or parsed.password:
                    raise ValueError("Demo endpoints must be HTTPS without credentials.")
                self.live = True
            self.payload.setdefault("demos", []).append(dict(docs=docs, refuse=required(block, "refuse"), endpoint=endpoint, limit=int(block.get("limit", 0))))
            index = len(self.payload["demos"]) - 1
            samples = "".join(f'<button type="button" class="dm-sample">{esc(sample)}</button>' for sample in block.get("samples", []))
            badge = self.labels["liveDemo"] if endpoint else self.labels["localDemo"]
            return f'<figure class="wide-figure demo" data-demo="{index}"><div class="figure-top"><span class="figure-label">{icon("magnifying-glass")}{esc(required(block, "title"))}</span><span class="dm-badge"><i></i>{esc(badge)}</span></div><form class="dm-form" role="search"><label class="dm-field">{icon("magnifying-glass")}<input type="search" name="q" autocomplete="off" placeholder="{esc(block.get("placeholder", ""))}" aria-label="{esc(required(block, "title"))}"></label><button class="dm-go" type="submit">{esc(self.labels["ask"])}{icon("arrow-right")}</button></form><div class="dm-samples">{samples}</div><ol class="dm-results" aria-live="polite"><li class="dm-empty">{esc(self.labels["demoEmpty"])}</li></ol><figcaption class="diagram-caption">{r(required(block, "caption"))}</figcaption></figure>'
        if kind == "conveyor":
            stations = block["stations"]
            if not 3 <= len(stations) <= 7:
                raise ValueError("A conveyor figure needs three to seven stations.")
            stamps = block.get("stamps", [])
            parts = []
            for number, station in enumerate(stations):
                stamp_art = "".join(f'<i class="cv-stamp" data-tone="{esc(item.get("tone", "ok"))}" style="--k:{n}">{esc(required(item, "label"))}</i>' for n, item in enumerate(stamps)) if station.get("stamps") else ""
                parts.append(f'<button type="button" class="cv-station" style="--i:{number}">{icon(required(station, "icon"), "cv-icon")}<b>{esc(required(station, "label"))}</b>{stamp_art}<span class="db-tip" role="tooltip">{r(required(station, "tip"))}</span></button>')
            sheets = "".join(f'<span class="cv-sheet" style="--s:{n}"><i></i></span>' for n in range(3))
            return f'<figure class="wide-figure cvfig" data-conveyor style="--n:{len(stations)}"><div class="figure-top"><span class="figure-label">{icon("git-branch")}{esc(required(block, "title"))}</span></div><div class="cv-belt"><span class="cv-line" aria-hidden="true"></span><span class="cv-sheets" aria-hidden="true">{sheets}</span><div class="cv-stations">{"".join(parts)}</div></div><figcaption class="diagram-caption">{r(required(block, "caption"))}</figcaption></figure>'
        if kind == "runner":
            self.once("runner")
            flows = block["workflows"]
            if not 1 <= len(flows) <= 16:
                raise ValueError("A runner needs one to sixteen workflows.")
            for flow in flows:
                required(flow, "id"); required(flow, "label")
            self.live = True
            self.payload.setdefault("runners", []).append(dict(workflows=flows, text=block.get("text", {})))
            index = len(self.payload["runners"]) - 1
            options = "".join(f'<button type="button" class="rn-pick" data-wf="{n}" aria-pressed="{"true" if n == 0 else "false"}"><b>{esc(flow["label"])}</b><span>{esc(flow.get("text", ""))}</span></button>' for n, flow in enumerate(flows))
            t = block.get("text", {})
            return f'<figure class="wide-figure runner" data-runner="{index}"><div class="figure-top"><span class="figure-label">{icon("play")}{esc(required(block, "title"))}</span><span class="dm-badge"><i></i>{esc(self.labels["localDemo"])}</span></div><div class="rn-picks" role="group">{options}</div><div class="nc-view" aria-label="{esc(block.get("side_title", ""))}"><div class="nc-world"><svg class="nc-edges" aria-hidden="true"></svg></div><div class="nc-zoom"><button type="button" data-z="out" aria-label="-">−</button><button type="button" data-z="in" aria-label="+">+</button><button type="button" data-z="fit" title="{esc(t.get("fit", "Fit"))}" aria-label="{esc(t.get("fit", "Fit"))}">⤢</button></div><div class="nc-run"><button type="button" class="rn-btn primary" data-act="sample">{icon("play")}<span>{esc(t.get("sample", "Run the sample"))}</span></button><label class="rn-btn rn-upload">{icon("tray")}<span>{esc(t.get("upload", "Your files"))}</span><input type="file" multiple hidden></label></div><div class="rn-drop" hidden>{esc(t.get("drop", "Drop files here"))}</div><p class="nc-status" aria-live="polite"></p><div class="rn-files"></div></div><figcaption class="diagram-caption">{r(required(block, "caption"))}</figcaption></figure>'
        if kind == "database":
            zones = block["zones"]
            if not 2 <= len(zones) <= 5:
                raise ValueError("A database figure needs two to five zones.")
            looks = ("docs", "versions", "segments", "vectors")
            parts = []
            for number, zone in enumerate(zones):
                look = zone.get("look", "docs")
                if look not in looks:
                    raise ValueError("Database zone looks are docs, versions, segments or vectors.")
                items = zone.get("items", [])
                if look == "docs":
                    art = "".join(f'<span class="db-doc{" hl" if n == zone.get("hit", 0) else ""}"><i></i><em>{esc(item)}</em></span>' for n, item in enumerate(items[:10]))
                elif look == "versions":
                    art = "".join(f'<span class="db-ver{" hl" if n == len(items) - 1 else ""}"><b>{esc(item)}</b><i></i></span>' for n, item in enumerate(items[:4]))
                elif look == "segments":
                    art = "".join(f'<span class="db-seg{" hl" if n < 3 else ""}" style="--w:{55 + (n * 23) % 40}%"><i></i></span>' for n in range(7))
                else:
                    art = "".join(f'<span class="db-vec{" hl" if n < 3 else ""}">' + "".join(f'<i style="--h:{(n * 7 + k * 13) % 9 + 2}"></i>' for k in range(16)) + "</span>" for n in range(7))
                badge = f'<span class="db-badge">{esc(zone["badge"])}</span>' if zone.get("badge") else ""
                parts.append(f'<button type="button" class="db-zone" data-look="{look}" style="--i:{number}"><span class="db-head"><b>{esc(required(zone, "label"))}</b>{badge}</span><span class="db-art" aria-hidden="true">{art}</span><span class="db-tip" role="tooltip">{r(required(zone, "tip"))}</span></button>')
            engine = block["engine"]
            return f'<figure class="wide-figure dbfig" data-database aria-labelledby="db-title-{len(parts)}"><div class="figure-top"><span class="figure-label" id="db-title-{len(parts)}">{icon("database")}{esc(required(block, "title"))}</span></div><div class="db-can"><button type="button" class="db-engine"><span class="db-lid" aria-hidden="true"></span><b>{esc(required(engine, "name"))}</b><span class="db-tip" role="tooltip">{r(required(engine, "tip"))}</span></button><div class="db-zones" style="--n:{len(parts)}">{"".join(parts)}</div></div><figcaption class="diagram-caption">{r(required(block, "caption"))}</figcaption></figure>'
        if kind == "askchat":
            docs, examples = block["docs"], block["examples"]
            if not 2 <= len(docs) <= 200 or not 1 <= len(examples) <= 4:
                raise ValueError("An ask-chat needs two to two hundred documents and one to four examples.")
            ids = {required(doc, "id") for doc in docs}
            for doc in docs:
                required(doc, "title"); required(doc, "text")
            for example in examples:
                required(example, "q"); required(example, "answer")
                for key in ("e5", "bm25", "final", "sources"):
                    if any(item not in ids for item in example.get(key, [])):
                        raise ValueError("Ask-chat rankings must name declared documents.")
            self.payload.setdefault("askchats", []).append(dict(docs=docs, examples=examples, refuse=required(block, "refuse"), steps=block["steps"], name=block.get("name", "AI")))
            index = len(self.payload["askchats"]) - 1
            chips = "".join(f'<button type="button" class="ac-chip" data-ex="{n}">{esc(example["q"])}</button>' for n, example in enumerate(examples))
            arrow = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M6 11l6-6 6 6"/></svg>'
            steps = "".join(f'<li class="ac-step" data-k="{esc(required(step, "id"))}"><span class="ac-n">{n + 1:02d}</span><div><b>{esc(required(step, "label"))}</b><div class="ac-out"></div></div></li>' for n, step in enumerate(block["steps"]))
            return f'<figure class="wide-figure askchat" data-askchat="{index}"><div class="figure-top"><span class="figure-label">{icon("chat-circle-text")}{esc(required(block, "title"))}</span></div><div class="ac-grid"><div class="ac-chat"><div class="ac-thread" aria-live="polite"></div><div class="ac-chips">{chips}</div><form class="ac-ask"><div class="ac-field"><textarea rows="1" aria-label="{esc(block.get("placeholder", ""))}" placeholder="{esc(block.get("placeholder", ""))}"></textarea></div><div class="ac-bar"><span class="ac-orb sm" aria-hidden="true"></span><button type="submit" class="ac-send" aria-label="{esc(self.labels["ask"])}"><span class="ac-arrows" aria-hidden="true">{arrow}{arrow}</span></button></div></form><p class="ac-disclosure">{r(block.get("disclosure", ""))}</p></div><aside class="ac-side" aria-live="polite"><p class="ac-side-title">{esc(block.get("side_title", ""))}</p><ol class="ac-steps">{steps}</ol></aside></div><figcaption class="diagram-caption">{r(required(block, "caption"))}</figcaption></figure>'
        if kind == "dotmatrix":
            outcomes, series, items = block["outcomes"], block["series"], block["items"]
            if len(outcomes) != 3 or not 2 <= len(series) <= 8 or not 2 <= len(items) <= 40:
                raise ValueError("A dot matrix needs three outcomes, two to eight series and two to forty items.")
            keys = [slug(o["id"]) for o in outcomes]
            rows = []
            for entry in series:
                values = entry["values"]
                if len(values) != len(items) or any(v not in keys for v in values):
                    raise ValueError("Every dot-matrix series needs one declared outcome per item.")
                first = values.count(keys[0]); top = first + values.count(keys[1])
                dots = "".join(f'<i class="dx-dot" data-o="{v}" tabindex="0" style="--d:{n}" data-tip="{esc(items[n])}"></i>' for n, v in enumerate(values))
                rows.append(f'<li class="dx-row{" strong" if entry.get("highlight") else ""}"><span class="dx-label">{esc(required(entry, "label"))}</span><span class="dx-dots">{dots}</span><span class="dx-num"><b>{first}</b><small>/{len(items)} · {top}</small></span></li>')
            legend = "".join(f'<span class="dx-key" data-o="{o["id"]}"><i></i>{esc(required(o, "label"))}</span>' for o in outcomes)
            return f'<figure class="wide-figure dotmatrix" data-dotmatrix><div class="figure-top"><span class="figure-label">{icon("sort-descending")}{esc(required(block, "title"))}</span><span class="dx-legend">{legend}</span></div><ol class="dx-rows">{"".join(rows)}</ol><p class="dx-hover" aria-live="polite"></p><figcaption class="diagram-caption">{r(required(block, "caption"))}</figcaption></figure>'
        raise ValueError(f"Unknown block type: {kind}")

THEME_KEYS = {"paper", "ink", "body", "muted", "faint", "line", "accent", "tint", "card", "signal"}
COLOR = re.compile(r"^#[0-9a-fA-F]{3,8}$")

def theme_style(theme):
    """Adopt the host site's colour tokens. Only plain hex values for known tokens are accepted."""
    if not theme:
        return ""
    def tokens(values):
        result = []
        for key, value in values.items():
            if key not in THEME_KEYS or not isinstance(value, str) or not COLOR.fullmatch(value):
                raise ValueError(f"Theme tokens are known names with hex colours: {key}")
            result.append(f"--{key}:{value}")
        return ";".join(result)
    css = ":root{" + tokens(theme.get("light", {})) + "}"
    if theme.get("dark"):
        dark = tokens(theme["dark"])
        css += f"@media (prefers-color-scheme:dark){{:root:not([data-theme=light]){{{dark}}}}}:root[data-theme=dark]{{{dark}}}"
    return f"<style>{css}</style>"

def page_html(language, content, brief, cover_name):
    labels, page = LABELS[language], Page(language, content)
    title, subtitle = required(content, "title"), required(content, "subtitle")
    author = required(brief["author"], "name")
    profiles = brief["author"].get("profiles", [])
    social = profile_links(profiles, labels)
    author_markup = f'<button class="author-button" id="author-button" type="button" aria-controls="author-card" aria-expanded="false" aria-haspopup="dialog">{esc(author)}</button>' if profiles else esc(author)
    sections, toc, seen = [], [], set()
    for section in content["sections"]:
        key = slug(section["id"])
        if key in seen or key in {"top", "article", "pipeline", "pipeline-title", "pipeline-panel", "step-rail", "step-explainer", "step-count", "graph-title", "graph-detail", "author-card", "author-button", "glossary-tooltip", "article-data", "reading-time", "next-step", "play-flow"} or key.startswith("tab-"):
            raise ValueError(f"Duplicate or reserved section id: {key}")
        seen.add(key)
        heading = required(section, "title")
        toc.append(f'<a href="#{key}">{esc(section.get("toc", heading))}</a>')
        blocks = "".join(page.block(block) for block in section["blocks"])
        sections.append(f'<section id="{key}" class="reveal"><h2>{esc(heading)}</h2>{blocks}</section>')
    if not sections:
        raise ValueError("At least one section is required.")
    date = datetime.date.fromisoformat(required(brief, "date"))
    date_text = date.strftime("%B") + f" {date.day}, {date.year}" if language == "en" else f'{date.day} {["stycznia","lutego","marca","kwietnia","maja","czerwca","lipca","sierpnia","września","października","listopada","grudnia"][date.month - 1]} {date.year}'
    project = f'<div><dt>{esc(labels["project"])}</dt><dd>{esc(brief["project"])}</dd></div>' if brief.get("project") else ""
    category = f'<p class="eyebrow">{esc(content["category"])}</p>' if content.get("category") else ""
    title_lines = content.get("title_lines")
    display_title = '<br class="hero-break"> '.join(esc(line) for line in title_lines) if title_lines else esc(title)
    if content.get("title_tone"):
        strong, soft = content["title_tone"]
        display_title = f'{esc(strong)} <span class="tone">{esc(soft)}</span>'
    ai_note = labels["aiDrafted"] if brief.get("ai_role") == "drafted" else labels["aiNote"]
    theme = theme_style(brief.get("theme"))
    cover = ""
    if cover_name:
        alt = required(content, "cover_alt")
        generated = labels["generated"] if brief["cover"].get("generated") else ""
        cover = f'<figure class="cover"><img src="assets/{cover_name}" alt="{esc(alt)}" fetchpriority="high"></figure><div class="cover-caption"><span>{esc(content.get("cover_caption", ""))}</span><span>{esc(generated)}</span></div>'
    live = content.get("cover_live")
    if live and not cover_name:
        items = live["items"]
        if not 3 <= len(items) <= 14:
            raise ValueError("A live cover needs three to fourteen items.")
        hit = int(live.get("hit", 0))
        if not 0 <= hit < len(items):
            raise ValueError("Live cover hit must index an item.")
        ranked = [int(n) for n in live.get("ranked", [hit])]
        if not ranked or ranked[0] != hit or any(not 0 <= n < len(items) for n in ranked) or len(set(ranked)) != len(ranked) or len(ranked) > 5:
            raise ValueError("Live cover ranking lists up to five distinct item indexes, starting with the hit.")
        pills = "".join(f'<li class="lc-pill{" hit" if n == hit else ""}"{f" data-rank={ranked.index(n) + 1}" if n in ranked else ""} style="--i:{n}">{esc(required(dict(t=item), "t"))}</li>' for n, item in enumerate(items))
        cover = f'<figure class="cover live-cover" data-live-cover aria-label="{esc(required(content, "cover_alt"))}"><ol class="lc-pills" aria-hidden="true">{pills}</ol><svg class="lc-wires" aria-hidden="true"></svg><div class="lc-query" aria-hidden="true"><span class="lc-icon"></span><span class="lc-typed" data-text="{esc(required(live, "query"))}"></span><span class="lc-caret"></span></div><p class="lc-answer" aria-hidden="true"><b>{esc(items[hit])}</b><span>{esc(live.get("note", ""))}</span></p></figure><div class="cover-caption"><span>{esc(content.get("cover_caption", ""))}</span><span></span></div>'
    author_card = f'<div class="author-card" id="author-card" role="dialog" aria-label="{esc(labels["profiles"])}" tabindex="-1" hidden><h2>{esc(author)}</h2><p>{esc(labels["authorDescription"])}</p><div class="author-links">{social}</div></div>' if profiles else ""
    payload = json.dumps(page.payload, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")
    return f'<!doctype html>\n<html lang="{language}"{' class="has-dark"' if brief.get("theme", {}).get("dark") else ""}><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="{"light dark" if brief.get("theme", {}).get("dark") else "light"}"><meta name="description" content="{esc(subtitle)}"><title>{esc(title)}</title><link rel="stylesheet" href="assets/article.css"><link rel="stylesheet" href="assets/figures.css">{theme}</head><body><a class="skip" href="#article">{esc(labels["skip"])}</a><div class="progress" aria-hidden="true"><span></span></div><div class="sheet" id="top"><main><div class="hero"><div class="hero-head"><div>{category}<h1>{display_title}</h1><p class="dek">{esc(subtitle)}</p></div><dl class="metadata"><div><dt>{esc(labels["published"])}</dt><dd><time datetime="{date.isoformat()}">{esc(date_text)}</time></dd></div><div class="byline"><dt>{esc(labels["author"])}</dt><dd>{author_markup}</dd></div>{project}<div><dt>{esc(labels["reading"])}</dt><dd id="reading-time">1 min</dd></div></dl></div>{cover}</div><div class="reading-layout"><aside class="sidebar" aria-label="{esc(labels["contents"])}"><p class="sidebar-title">{esc(labels["contents"])}</p><nav class="toc">{"".join(toc)}</nav></aside><article class="article" id="article">{"".join(sections)}</article></div></main><footer class="footer"><span>{esc(brief.get("project") or author)}</span><span>{esc(ai_note)}</span><span>{esc(labels["offlineDemo"] if page.live else labels["offline"])}</span><a href="#top">{esc(labels["back"])}</a></footer></div><div class="tooltip" id="glossary-tooltip" role="tooltip" hidden></div>{author_card}<script type="application/json" id="article-data">{payload}</script><script src="assets/article.js" defer></script><script src="assets/figures.js" defer></script></body></html>\n'

def render(brief_path, output, base_url=""):
    brief_path, output = Path(brief_path).resolve(), Path(output).resolve()
    if output.exists():
        raise ValueError("Output already exists. Choose a new directory; nothing was overwritten.")
    brief = json.loads(brief_path.read_text(encoding="utf-8"))
    languages = brief["languages"]
    if not languages or any(key not in LABELS for key in languages):
        raise ValueError("Languages must contain en, pl or both.")
    primary = "en" if "en" in languages else next(iter(languages))
    cover_path = None
    if brief.get("cover"):
        cover_path = Path(required(brief["cover"], "path"))
        if not cover_path.is_absolute():
            cover_path = brief_path.parent / cover_path
        cover_path = cover_path.resolve()
        if not cover_path.is_file() or cover_path.suffix.lower() not in (".png", ".jpg", ".jpeg", ".webp", ".svg"):
            raise ValueError("Cover must be an existing local image file.")
    cover_name = "cover" + cover_path.suffix.lower() if cover_path else None
    rendered = {("index.html" if language == primary else language + ".html"): page_html(language, content, brief, cover_name) for language, content in languages.items()}
    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=".article-build-", dir=output.parent) as temporary:
        staging = Path(temporary)
        assets = staging / "assets"; assets.mkdir()
        for name in ("fonts", "icons"):
            shutil.copytree(SHARED / name, assets / name)
        for name in ("article.css", "article.js", "figures.css", "figures.js"):
            shutil.copy2(SHARED / name, assets / name)
        if cover_path:
            shutil.copy2(cover_path, assets / cover_name)
        if brief.get("runner_engine"):
            engine = Path(brief["runner_engine"])
            if not engine.is_absolute():
                engine = brief_path.parent / engine
            for name in ("n8n-mini.bundle.js", "workflows.js"):
                if not (engine / name).is_file():
                    raise ValueError(f"Runner engine directory lacks {name}.")
            (assets / "runner").mkdir()
            for name in ("n8n-mini.bundle.js", "workflows.js"):
                shutil.copy2(engine / name, assets / "runner" / name)
        for name, body in rendered.items():
            if base_url:  # absolute asset URLs for a page served by a host site, e.g. /realizacje/<slug>/
                body = body.replace('="assets/', f'="{base_url}assets/')
            (staging / name).write_text(body, encoding="utf-8")
        shutil.copytree(staging, output)
    return list(rendered)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--brief", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--base-url", default="", help="public URL of the output folder when a host site serves it, e.g. /realizacje/my-case/")
    args = parser.parse_args()
    if args.base_url and not re.fullmatch(r"/(?:[a-z0-9-]+/)*", args.base_url):
        parser.exit(1, "Cannot render article: --base-url is a site path like /realizacje/my-case/\n")
    try:
        pages = render(args.brief, args.out, args.base_url)
    except (ValueError, KeyError, TypeError, OSError) as error:
        parser.exit(1, f"Cannot render article: {error}\n")
    print("Created " + ", ".join(pages) + ". No existing output was overwritten.")

if __name__ == "__main__":
    main()
