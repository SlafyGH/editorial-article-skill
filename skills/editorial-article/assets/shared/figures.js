'use strict';
(() => {
  const ASSETS = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '') || 'assets/';
  const root = document.documentElement;
  root.classList.add('js-figs');
  const data = JSON.parse(document.getElementById('article-data')?.textContent || '{}');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const updaters = [];
  let queued = false;
  const tick = () => { queued = false; updaters.forEach(update => update()); };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(tick); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', queue);
  const line = () => innerHeight * 0.62;
  const activeIndex = steps => {
    let index = 0;
    steps.forEach((step, n) => { if (step.getBoundingClientRect().top < line()) index = n; });
    return index;
  };
  const countTo = (node, value) => {
    const from = Number(node.textContent) || 0;
    if (reduced || from === value) { node.textContent = value; return; }
    const start = performance.now();
    const frame = now => {
      const t = Math.min(1, (now - start) / 600), eased = 1 - Math.pow(1 - t, 3);
      node.textContent = Math.round(from + (value - from) * eased);
      if (t < 1) requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  };

  // Scroll-driven process
  document.querySelectorAll('[data-scrolly]').forEach(figure => {
    const steps = [...figure.querySelectorAll('.sc-step')];
    const nodes = [...figure.querySelectorAll('.sc-node')];
    const order = nodes.map(node => node.dataset.node);
    const track = figure.querySelector('.sc-track'), card = figure.querySelector('.sc-card');
    const count = figure.querySelector('.sc-count b');
    let current = -1;
    function render(index) {
      const step = steps[index];
      const focus = step.dataset.focus.split(' ').filter(Boolean);
      const reach = Math.max(-1, ...focus.map(key => order.indexOf(key)));
      nodes.forEach((node, n) => {
        node.classList.toggle('on', focus.includes(node.dataset.node));
        node.classList.toggle('done', n < reach && !focus.includes(node.dataset.node));
      });
      track.style.setProperty('--p', order.length > 1 ? Math.max(0, reach) / (order.length - 1) : 1);
      steps.forEach((other, n) => other.classList.toggle('on', n === index));
      count.textContent = String(index + 1).padStart(2, '0');
      const source = step.querySelector('.step-card');
      const old = new Map([...card.querySelectorAll('li[data-key]')].map(li => [li.dataset.key, li.getBoundingClientRect()]));
      let next;
      if (source) next = source.cloneNode(true);
      else {
        next = document.createElement('p'); next.className = 'sc-big';
        const strong = document.createElement('b'); strong.textContent = step.querySelector('h3').textContent + ' ';
        strong.style.fontWeight = 'inherit';
        next.append(strong);
      }
      card.replaceChildren(next);
      card.querySelectorAll('li[data-key]').forEach((li, n) => {
        const before = old.get(li.dataset.key);
        if (reduced) return;
        if (before) {
          const after = li.getBoundingClientRect();
          li.animate([{ transform: `translateY(${before.top - after.top}px)` }, { transform: 'none' }], { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' });
        } else {
          li.classList.add('enter'); li.style.transitionDelay = n * 60 + 'ms';
          requestAnimationFrame(() => requestAnimationFrame(() => li.classList.remove('enter')));
        }
      });
      if (!reduced && !source) next.animate([{ opacity: 0, filter: 'blur(6px)', transform: 'translateY(8px)' }, { opacity: 1, filter: 'none', transform: 'none' }], { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' });
      if (!reduced) { card.classList.remove('scan'); void card.offsetWidth; card.classList.add('scan'); }
    }
    updaters.push(() => { const index = activeIndex(steps); if (index !== current) { current = index; render(index); } });
  });

  // Conversations replayed by scroll position
  document.querySelectorAll('[data-replay]').forEach(figure => {
    const messages = [...figure.querySelectorAll('.rp-msg')];
    const convs = [...figure.querySelectorAll('.rp-conv')];
    const dots = [...figure.querySelectorAll('.rp-dots i')];
    if (reduced) { figure.classList.add('static'); return; }
    messages.forEach(message => message.classList.add('wait'));
    const thinking = document.documentElement.lang === 'pl' ? 'Szukam w źródłach…' : 'Checking sources…';
    let shown = 0;
    updaters.push(() => {
      const box = figure.getBoundingClientRect();
      const room = box.height - innerHeight * 0.75;
      const progress = Math.min(1, Math.max(0, (innerHeight * 0.35 - box.top) / room));
      const visible = Math.min(messages.length, Math.floor(progress * (messages.length + 0.6)) + (box.top < innerHeight * 0.5 ? 1 : 0));
      if (visible === shown) return;
      messages.forEach((message, n) => {
        const on = n < visible;
        if (on && message.classList.contains('wait')) {
          message.classList.remove('wait');
          if (message.classList.contains('bot')) {
            message.dataset.thinking = thinking; message.classList.add('thinking');
            setTimeout(() => message.classList.remove('thinking'), 900);
          }
        } else if (!on) message.classList.add('wait');
      });
      shown = visible;
      const last = messages[Math.max(0, visible - 1)];
      const active = convs.indexOf(last.closest('.rp-conv'));
      convs.forEach((conv, n) => conv.classList.toggle('on', n === active));
      dots.forEach((dot, n) => dot.classList.toggle('on', n <= active));
    });
  });

  // Scoreboard: each scroll step selects one method
  document.querySelectorAll('[data-scoreboard]').forEach(figure => {
    const board = data.scoreboards?.[Number(figure.dataset.scoreboard)];
    if (!board) return;
    const steps = [...figure.querySelectorAll('.sb-step')];
    const tiles = [...figure.querySelectorAll('.sb-tile')];
    const bars = [...figure.querySelectorAll('.sb-bars li')];
    const name = figure.querySelector('.sb-name');
    const first = figure.querySelector('[data-k=first]'), top = figure.querySelector('[data-k=top]');
    const [a, b] = board.outcomes;
    bars.forEach((bar, n) => bar.style.setProperty('--r', n));
    new IntersectionObserver((entries, observer) => entries.forEach(entry => { if (entry.isIntersecting) { figure.classList.add('seen'); observer.disconnect(); } }), { threshold: .3 }).observe(figure);
    let current = -1;
    updaters.push(() => {
      const index = activeIndex(steps);
      if (index === current) return;
      current = index;
      const key = board.series[index], totals = board.totals[key];
      tiles.forEach((tile, n) => {
        const outcome = board.items[n][key];
        tile.style.setProperty('--d', n);
        if (tile.dataset.o !== outcome) { tile.dataset.o = outcome; if (!reduced) tile.animate([{ transform: 'scale(.82)' }, { transform: 'none' }], { duration: 500, delay: n * 28, easing: 'cubic-bezier(.16,1,.3,1)' }); }
      });
      steps.forEach((step, n) => step.classList.toggle('on', n === index));
      bars.forEach((bar, n) => bar.classList.toggle('on', n === index));
      name.textContent = board.labels[index];
      countTo(first, totals[a]); countTo(top, totals[a] + totals[b]);
    });
  });

  // Search demo: BM25 in the browser, or a configured HTTPS endpoint
  const fold = value => value.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l');
  const STOP = new Set('a i w z o u na do za po od ze we co czy jak jest sa to ten ta te sie nie mi my wy ich nas was the and for are you can with of to in is it'.split(' '));
  const terms = value => fold(value).split(/[^a-z0-9]+/).filter(word => word.length > 2 && !STOP.has(word)).map(word => word.slice(0, 5));
  document.querySelectorAll('[data-demo]').forEach(figure => {
    const demo = data.demos?.[Number(figure.dataset.demo)];
    if (!demo) return;
    const form = figure.querySelector('.dm-form'), input = form.q, list = figure.querySelector('.dm-results');
    const docs = demo.docs.map(doc => ({ ...doc, words: terms(doc.title + ' ' + doc.text) }));
    const avg = docs.reduce((sum, doc) => sum + doc.words.length, 0) / docs.length;
    const df = new Map();
    docs.forEach(doc => new Set(doc.words).forEach(word => df.set(word, (df.get(word) || 0) + 1)));
    let asked = 0;
    function bm25(query) {
      const q = [...new Set(terms(query))];
      return docs.map(doc => {
        let score = 0;
        q.forEach(word => {
          const f = doc.words.filter(w => w === word).length;
          if (!f) return;
          const idf = Math.log(1 + (docs.length - df.get(word) + .5) / (df.get(word) + .5));
          score += idf * f * 2.2 / (f + 1.2 * (.25 + .75 * doc.words.length / avg));
        });
        return { doc, score, q };
      }).filter(hit => hit.score > 0).sort((x, y) => y.score - x.score).slice(0, 3);
    }
    function mark(textValue, q) {
      const p = document.createElement('p');
      textValue.split(/(\s+)/).forEach(part => {
        const stem = fold(part).replace(/[^a-z0-9]/g, '').slice(0, 5);
        if (stem.length > 2 && q.includes(stem)) { const m = document.createElement('mark'); m.textContent = part; p.append(m); } else p.append(part);
      });
      return p;
    }
    function refuse(message) { const li = document.createElement('li'); li.className = 'dm-refuse'; li.textContent = message; list.replaceChildren(li); }
    async function ask(query) {
      if (!query.trim()) return;
      if (demo.limit && asked >= demo.limit) { refuse(document.documentElement.lang === 'pl' ? 'Limit pytań w tej sesji wyczerpany.' : 'Question limit for this session reached.'); return; }
      asked++;
      if (demo.endpoint) {
        try {
          const response = await fetch(demo.endpoint.url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ message: query }) });
          const body = await response.json();
          const li = document.createElement('li'); li.className = body.status === 'answered' ? 'dm-hit' : 'dm-refuse';
          li.textContent = body.answer; list.replaceChildren(li); return;
        } catch { /* fall back to the local index */ }
      }
      const hits = bm25(query);
      if (!hits.length) { refuse(demo.refuse); return; }
      const best = hits[0].score;
      list.replaceChildren(...hits.map((hit, n) => {
        const li = document.createElement('li'); li.className = 'dm-hit'; li.style.setProperty('--i', n);
        const rank = document.createElement('span'); rank.textContent = String(n + 1).padStart(2, '0');
        const body = document.createElement('div'); const title = document.createElement('b'); title.textContent = hit.doc.title;
        body.append(title, mark(hit.doc.text, hit.q));
        const score = document.createElement('div'); score.className = 'dm-score'; score.style.setProperty('--s', hit.score / best);
        score.append('BM25 ' + hit.score.toFixed(2), document.createElement('i'));
        li.append(rank, body, score); return li;
      }));
    }
    form.addEventListener('submit', event => { event.preventDefault(); ask(input.value); });
    figure.querySelectorAll('.dm-sample').forEach(button => button.addEventListener('click', () => { input.value = button.textContent; ask(input.value); }));
  });

  // Graph with light physics, drag and neighbour highlight
  document.querySelectorAll('.graph-figure').forEach(figure => {
    const svg = figure.querySelector('svg');
    const groups = [...svg.querySelectorAll('.graph-node')];
    const edges = [...svg.querySelectorAll('.graph-edge')];
    const W = 660, H = 300;
    const nodes = groups.map(group => {
      const circle = group.querySelector('circle'), label = group.querySelector('text');
      return { id: group.dataset.node, group, circle, label, x: +circle.getAttribute('cx'), y: +circle.getAttribute('cy'), vx: 0, vy: 0, fixed: false };
    });
    const byId = new Map(nodes.map(node => [node.id, node]));
    const links = edges.map(edge => ({ edge, a: byId.get(edge.dataset.a), b: byId.get(edge.dataset.b) })).filter(link => link.a && link.b);
    const hint = document.createElement('p'); hint.className = 'graph-hint';
    hint.textContent = document.documentElement.lang === 'pl' ? 'Przeciągnij węzeł. Najedź, aby zobaczyć sąsiadów.' : 'Drag a node. Hover to see its neighbours.';
    figure.querySelector('.graph-view').after(hint);
    function draw() {
      nodes.forEach(node => {
        node.circle.setAttribute('cx', node.x.toFixed(1)); node.circle.setAttribute('cy', node.y.toFixed(1));
        node.label.setAttribute('x', node.x.toFixed(1)); node.label.setAttribute('y', (node.y + 27).toFixed(1));
        node.label.setAttribute('text-anchor', node.x < 150 ? 'start' : node.x > 510 ? 'end' : 'middle');
      });
      links.forEach(({ edge, a, b }) => { edge.setAttribute('x1', a.x); edge.setAttribute('y1', a.y); edge.setAttribute('x2', b.x); edge.setAttribute('y2', b.y); });
    }
    let heat = 1, running = false;
    function step() {
      for (let i = 0; i < nodes.length; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j]; let dx = (b.x - a.x) / 1.7, dy = b.y - a.y; const d2 = Math.max(80, dx * dx + dy * dy);
        const f = 5200 / d2; const d = Math.sqrt(d2); dx /= d; dy /= d;
        a.vx -= dx * f * 1.6; a.vy -= dy * f * .6; b.vx += dx * f * 1.6; b.vy += dy * f * .6;
      }
      links.forEach(({ a, b }) => { const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1, f = (d - 130) * .01; a.vx += dx / d * f; a.vy += dy / d * f; b.vx -= dx / d * f; b.vy -= dy / d * f; });
      nodes.forEach(node => {
        node.vx += (W / 2 - node.x) * .0025; node.vy += (H / 2 - node.y) * .004;
        if (!node.fixed) { node.x += node.vx * heat; node.y += node.vy * heat; }
        node.vx *= .82; node.vy *= .82;
        node.x = Math.max(24, Math.min(W - 24, node.x)); node.y = Math.max(18, Math.min(H - 34, node.y));
      });
      draw(); heat *= .992;
      if (heat > .02) requestAnimationFrame(step); else running = false;
    }
    const kick = () => { heat = Math.max(heat, .6); if (!running && !reduced) { running = true; requestAnimationFrame(step); } };
    if (reduced) { for (let n = 0; n < 300; n++) { /* settle synchronously */ heat = 1; } }
    new IntersectionObserver((entries, observer) => entries.forEach(entry => { if (entry.isIntersecting) { kick(); observer.disconnect(); } }), { threshold: .2 }).observe(figure);
    const point = event => { const m = svg.getScreenCTM().inverse(); return { x: event.clientX * m.a + event.clientY * m.c + m.e, y: event.clientX * m.b + event.clientY * m.d + m.f }; };
    let dragging = null;
    groups.forEach(group => {
      const node = byId.get(group.dataset.node);
      group.addEventListener('pointerdown', event => { dragging = node; node.fixed = true; svg.classList.add('dragging'); group.setPointerCapture(event.pointerId); });
      group.addEventListener('pointermove', event => { if (dragging !== node) return; const p = point(event); node.x = p.x; node.y = p.y; kick(); draw(); });
      group.addEventListener('pointerup', () => { dragging = null; node.fixed = false; svg.classList.remove('dragging'); kick(); });
      group.addEventListener('pointerenter', () => {
        figure.classList.add('hovering');
        const near = new Set([node.id]);
        links.forEach(({ edge, a, b }) => { const hit = a === node || b === node; edge.classList.toggle('near', hit); if (hit) { near.add(a.id); near.add(b.id); } });
        groups.forEach(other => other.classList.toggle('near', near.has(other.dataset.node)));
      });
      group.addEventListener('pointerleave', () => { figure.classList.remove('hovering'); edges.forEach(edge => edge.classList.remove('near')); groups.forEach(other => other.classList.remove('near')); });
    });
  });

  // Contents: mark chapters already read
  const links = [...document.querySelectorAll('.toc a')];
  updaters.push(() => {
    const active = links.findIndex(link => link.classList.contains('active'));
    links.forEach((link, n) => link.classList.toggle('read', active > -1 && n < active));
  });

  // Live cover: documents settle in two arcs, the query types, wires rank the best matches
  document.querySelectorAll('[data-live-cover]').forEach(cover => {
    const typed = cover.querySelector('.lc-typed'), textValue = typed.dataset.text;
    const pills = [...cover.querySelectorAll('.lc-pill')], wires = cover.querySelector('.lc-wires');
    const query = cover.querySelector('.lc-query');
    function layout() {
      const narrow = cover.clientWidth < 560;
      if (narrow) return;
      const rows = narrow ? [Math.ceil(pills.length / 3), Math.ceil(pills.length / 3), pills.length - 2 * Math.ceil(pills.length / 3)] : [Math.ceil(pills.length / 2), Math.floor(pills.length / 2)];
      let n = 0;
      rows.forEach((count, row) => {
        for (let c = 0; c < count; c++, n++) {
          const t = count === 1 ? .5 : c / (count - 1);
          const spread = narrow ? .8 : (row ? .62 : .78);
          const x = 50 + (t - .5) * spread * 100;
          const arc = Math.pow((t - .5) * 2, 2);
          const y = (narrow ? 14 + row * 17 : 17 + row * 21) + arc * (narrow ? 6 : 11);
          const pill = pills[n];
          pill.style.setProperty('--x', x + '%'); pill.style.setProperty('--y', y + '%');
          pill.style.setProperty('--r', ((t - .5) * (row % 2 ? -9 : 12)).toFixed(1) + 'deg');
        }
      });
    }
    function wire() {
      const box = cover.getBoundingClientRect(), q = query.getBoundingClientRect();
      wires.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      const sx = q.left + q.width / 2 - box.left, sy = q.top - box.top;
      wires.replaceChildren(...pills.filter(pill => pill.dataset.rank).sort((a, b) => b.dataset.rank - a.dataset.rank).map(pill => {
        const r = pill.getBoundingClientRect();
        const ex = r.left + r.width / 2 - box.left, ey = r.bottom - box.top - 2;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', `M${sx},${sy} C${sx},${(sy + ey) / 2} ${ex},${(sy + ey) / 2} ${ex},${ey}`);
        if (pill.classList.contains('hit')) path.classList.add('hit');
        wires.append(path);
        path.style.setProperty('--len', Math.ceil(path.getTotalLength()));
        path.style.transitionDelay = (3 - pill.dataset.rank) * 140 + 'ms';
        return path;
      }));
    }
    layout();
    addEventListener('resize', () => { layout(); if (cover.classList.contains('found')) wire(); });
    if (reduced) { typed.textContent = textValue; cover.classList.add('go', 'found'); wire(); return; }
    requestAnimationFrame(() => requestAnimationFrame(() => cover.classList.add('go')));
    let n = 0;
    setTimeout(function type() {
      typed.textContent = textValue.slice(0, ++n);
      if (n < textValue.length) setTimeout(type, 24 + Math.random() * 36);
      else setTimeout(() => { wire(); requestAnimationFrame(() => cover.classList.add('found')); }, 380);
    }, 1500);
  });

  queue();
})();

// ---- shared: run once when a figure scrolls into view ----
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const data = JSON.parse(document.getElementById('article-data')?.textContent || '{}');
  const onView = (node, fn, threshold = 0.35) => {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { io.disconnect(); fn(); } }), { threshold });
    io.observe(node);
  };
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const wait = ms => new Promise(done => setTimeout(done, reduced ? 0 : ms));

  // Database figure: start the loop when visible
  document.querySelectorAll('[data-database]').forEach(fig => {
    fig.querySelectorAll('.db-doc').forEach((d, k) => d.style.animationDelay = `${k * 70}ms`);
    onView(fig, () => fig.classList.add('is-on'));
  });

  // Dot matrix: pop dots row by row, hover names the question
  document.querySelectorAll('[data-dotmatrix]').forEach(fig => {
    fig.querySelectorAll('.dx-row').forEach((row, n) => row.style.setProperty('--row', n));
    fig.classList.add('wait');
    onView(fig, () => { fig.classList.remove('wait'); fig.classList.add('is-on'); });
    const out = fig.querySelector('.dx-hover');
    const labels = {};
    fig.querySelectorAll('.dx-key').forEach(k => labels[k.dataset.o] = k.textContent);
    const dots = [...fig.querySelectorAll('.dx-dot')];
    const show = dot => {
      const row = dot.closest('.dx-row');
      const index = Number(dot.style.getPropertyValue('--d'));
      dots.forEach(d => d.classList.toggle('same', d !== dot && Number(d.style.getPropertyValue('--d')) === index));
      out.textContent = `„${dot.dataset.tip}” · ${row.querySelector('.dx-label').textContent}: ${labels[dot.dataset.o]}`;
    };
    dots.forEach(dot => { dot.addEventListener('mouseenter', () => show(dot)); dot.addEventListener('focus', () => show(dot)); dot.addEventListener('click', () => show(dot)); });
    fig.addEventListener('mouseleave', () => { dots.forEach(d => d.classList.remove('same')); out.textContent = ''; });
  });

  // Ask chat: chat on the left, the system's steps on the right
  document.querySelectorAll('[data-askchat]').forEach(fig => {
    const cfg = data.askchats?.[Number(fig.dataset.askchat)];
    if (!cfg) return;
    const docs = Object.fromEntries(cfg.docs.map(d => [d.id, d]));
    const thread = fig.querySelector('.ac-thread'), form = fig.querySelector('.ac-ask');
    const field = form.querySelector('textarea'), send = form.querySelector('.ac-send'), barOrb = form.querySelector('.ac-orb');
    const steps = [...fig.querySelectorAll('.ac-step')];
    const chips = [...fig.querySelectorAll('.ac-chip')];
    let busy = false;

    const words = (text, into) => text.split(' ').forEach((w, i) => {
      const m = /^(.*?)(\[\d+\])([.,;:!?]?)$/.exec(w);
      const span = el('span', 'ac-w'); span.style.animationDelay = `${i * 26}ms`;
      if (m) { span.append(m[1]); span.append(el('sup', 'ac-cite', m[2])); span.append(m[3] + ' '); }
      else span.textContent = w + ' ';
      into.append(span);
    });
    const list = (ids, hits) => {
      const ol = el('ol');
      ids.slice(0, 3).forEach((id, n) => { const li = el('li', hits.includes(id) ? 'hit' : ''); li.style.animationDelay = `${n * 90}ms`; li.append(el('em', '', n + 1), docs[id].title); ol.append(li); });
      return ol;
    };
    const vector = () => {
      const box = el('div', 'ac-vec');
      for (let k = 0; k < 28; k++) { const i = el('i'); i.style.height = `${3 + Math.abs(Math.sin(k * 1.7 + field.value.length)) * 13}px`; i.style.animationDelay = `${k * 14}ms`; box.append(i); }
      return box;
    };
    const tokens = text => text.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/ł/g, 'l').match(/[a-z0-9]{3,}/g) || [];
    const bm25 = query => {
      const stem = t => t.slice(0, 5);
      const qs = [...new Set(tokens(query).map(stem))];
      const bags = cfg.docs.map(d => tokens(d.title + ' ' + d.text).map(stem));
      const avg = bags.reduce((a, b) => a + b.length, 0) / bags.length;
      return bags.map((bag, n) => {
        let score = 0;
        qs.forEach(q => { const tf = bag.filter(t => t === q).length; if (!tf) return; const df = bags.filter(b => b.includes(q)).length; const idf = Math.log(1 + (bags.length - df + .5) / (df + .5)); score += idf * tf * 2.2 / (tf + 1.2 * (.25 + .75 * bag.length / avg)); });
        return { id: cfg.docs[n].id, score };
      }).sort((a, b) => b.score - a.score);
    };
    const reset = () => steps.forEach(s => { s.classList.remove('on', 'now'); s.querySelector('.ac-out').replaceChildren(); });
    const light = async (n, content) => {
      steps.forEach(s => s.classList.remove('now'));
      const step = steps[n]; if (!step) return;
      step.classList.add('on', 'now');
      const out = step.querySelector('.ac-out');
      if (content) out.replaceChildren(content);
      await wait(620);
    };
    const note = (text, cls = '') => el('span', cls, text);

    async function run(example, text) {
      if (busy) return; busy = true;
      chips.forEach(c => c.classList.toggle('on', example && Number(c.dataset.ex) === cfg.examples.indexOf(example)));
      const user = el('div', 'ac-msg ac-user'); user.append(el('p', '', text)); thread.append(user);
      const ai = el('div', 'ac-msg ac-ai'); const orb = el('span', 'ac-orb busy'); const body = el('div', 'ac-body');
      const p = el('p', 'ac-shimmer', cfg.steps[0].thinking || '…'); body.append(p); ai.append(orb, body); thread.append(ai);
      thread.scrollTop = thread.scrollHeight; barOrb.classList.add('busy');
      reset();
      let final, answer, refused, sources;
      if (example) {
        await light(0, vector());
        await light(1, list(example.e5, example.sources || []));
        await light(2, list(example.bm25, example.sources || []));
        await light(3, list(example.final, example.sources || []));
        refused = !!example.refused; answer = example.answer; sources = example.sources || [];
        await light(4, note(example.check, refused ? 'ac-no' : 'ac-ok'));
      } else {
        const ranked = bm25(text);
        const ids = ranked.map(r => r.id);
        const top = ranked[0];
        await light(0, vector());
        await light(1, note(cfg.steps[1].local || ''));
        await light(2, list(ids, top.score > 1.2 ? [top.id] : []));
        await light(3, list(ids, top.score > 1.2 ? [top.id] : []));
        refused = top.score <= 1.2;
        sources = refused ? [] : [top.id];
        answer = refused ? cfg.refuse : `${docs[top.id].text} [1]`;
        await light(4, note(refused ? cfg.steps[4].none : cfg.steps[4].ok, refused ? 'ac-no' : 'ac-ok'));
      }
      await light(5, note(refused ? cfg.steps[5].refused : cfg.steps[5].ok, refused ? 'ac-no' : 'ac-ok'));
      p.className = ''; p.textContent = ''; words(answer, p);
      if (sources.length) { const src = el('div', 'ac-src'); sources.forEach((id, n) => { const s = el('span', '', `[${n + 1}] ${docs[id].title}`); s.style.animationDelay = `${400 + n * 120}ms`; src.append(s); }); body.append(src); }
      orb.classList.remove('busy'); barOrb.classList.remove('busy');
      steps.forEach(s => s.classList.remove('now'));
      thread.scrollTop = thread.scrollHeight;
      busy = false;
    }

    chips.forEach(chip => chip.addEventListener('click', () => { const ex = cfg.examples[Number(chip.dataset.ex)]; run(ex, ex.q); }));
    field.addEventListener('input', () => send.classList.toggle('ready', !!field.value.trim()));
    field.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); } });
    form.addEventListener('click', e => { if (e.target === form) field.focus(); });
    form.addEventListener('submit', e => {
      e.preventDefault();
      const q = field.value.trim(); if (!q || busy) return;
      const ex = cfg.examples.find(x => x.q.toLowerCase() === q.toLowerCase());
      field.value = ''; send.classList.remove('ready');
      run(ex, q);
    });
    onView(fig, () => run(cfg.examples[0], cfg.examples[0].q), 0.45);
  });
})();

// ---- conveyor drawing and in-browser workflow runner ----
(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const data = JSON.parse(document.getElementById('article-data')?.textContent || '{}');
  const pl = document.documentElement.lang === 'pl';
  const el = (tag, cls, text) => { const n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; };
  const svg = (tag, attrs = {}) => { const n = document.createElementNS('http://www.w3.org/2000/svg', tag); Object.entries(attrs).forEach(([k, v]) => n.setAttribute(k, v)); return n; };
  const sleep = ms => new Promise(done => setTimeout(done, reduced ? 0 : ms));
  const onView = (node, fn, threshold = 0.35, margin = '0px') => {
    if (!('IntersectionObserver' in window)) { fn(); return; }
    const io = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { io.disconnect(); fn(); } }), { threshold, rootMargin: margin });
    io.observe(node);
  };

  document.querySelectorAll('[data-conveyor]').forEach(fig => onView(fig, () => fig.classList.add('is-on')));

  // Status families shared by the bundled n8n workflows: already known, needs a person, broken input, alert, accepted.
  const tone = status => {
    if (/^JUZ_|^BEZ_ZMIAN$|^ZAMKNIETA$|^TYLKO_RAPORT$/.test(status)) return 'seen';
    if (/^BLAD|^BLEDNA|^NIEOBSLUGIWANY$/.test(status)) return 'bad';
    if (/^DO_|^DUPLIKAT|^SPORNA$|^NIEPRZYPISANA$|^NIEPOROWNYWALNY$|^NIEAKTUALNY$|^POZA_OKRESEM$|^NIEAKTYWNY$|^NIEDOSTEPNY$|^POMINIETA$/.test(status)) return 'human';
    if (/^(BRAK|NISKI_STAN|PO_TERMINIE|NADCHODZACY|PODWYZKA|OBNIZKA|ZMIANA_PONIZEJ_PROGU|NIEZGODNY_STATUS|PRZEKROCZONY_CZAS|BRAK_TRESCI|WOLNA_ODPOWIEDZ|CZESCIOWO_ZAPLACONA|NIEZAPLACONA|NADPLATA|PRZYWROCONA|NOWY)$/.test(status)) return 'alert';
    return 'ok';
  };
  // n8n node type -> bundled icon
  const ICONS = { manualTrigger: 'play', formTrigger: 'tray', emailReadImap: 'envelope', gmailTrigger: 'envelope', microsoftOutlookTrigger: 'envelope', googleDriveTrigger: 'folder', googleDrive: 'folder', executeWorkflowTrigger: 'plugs-connected', scheduleTrigger: 'clock', code: 'code', if: 'git-branch', switch: 'git-merge', splitInBatches: 'arrows-clockwise', noOp: 'arrow-right', extractFromFile: 'file-text', convertToFile: 'file-arrow-down', dataTable: 'database', emailSend: 'envelope', httpRequest: 'globe' };
  const N = 100;
  let engineLoad;
  const loadEngine = () => engineLoad ||= new Promise((done, fail) => {
    let left = 2;
    [ASSETS + 'runner/n8n-mini.bundle.js', ASSETS + 'runner/workflows.js'].forEach(src => {
      const s = document.createElement('script'); s.src = src; s.async = false;
      s.onload = () => { if (!--left) done(window.N8nMini); }; s.onerror = fail;
      document.head.append(s);
    });
  });
  const plural = (n, one, few, many) => pl ? (n === 1 ? one : (n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20)) ? few : many) : (n === 1 ? one : many);

  // One n8n canvas: nodes at their exported positions, bezier connections, camera with fit / follow / drag.
  function Canvas(view, t) {
    const world = view.querySelector('.nc-world');
    const edgesLayer = world.querySelector('.nc-edges');
    let nodes = new Map(), edges = [], box = null, cam = { x: 0, y: 0, s: 1 };
    const apply = (animate = true) => {
      world.style.transition = animate && !reduced ? 'transform .45s cubic-bezier(.16,1,.3,1)' : 'none';
      world.style.transform = `translate(${cam.x}px,${cam.y}px) scale(${cam.s})`;
    };
    const fit = (animate = true) => {
      if (!box) return;
      const w = view.clientWidth, h = view.clientHeight;
      const s = Math.max(Math.min(w / (box.w + 80), h / (box.h + 80), 0.9), innerWidth < 760 ? 0.1 : 0.12);
      cam = { s, x: (w - box.w * s) / 2 - box.x * s, y: (h - box.h * s) / 2 - box.y * s };
      apply(animate);
    };
    const focus = name => {
      const n = nodes.get(name); if (!n) return;
      const w = view.clientWidth, h = view.clientHeight, s = Math.max(cam.s, innerWidth < 760 ? 0.5 : 0.7);
      cam = { s, x: w / 2 - (n.x + N / 2) * s, y: h / 2 - (n.y + N / 2) * s };
      apply(true);
    };
    function load(wf) {
      world.querySelectorAll('.nc-node').forEach(n => n.remove()); edgesLayer.replaceChildren(); nodes = new Map(); edges = [];
      const list = wf.nodes.filter(n => !n.type.endsWith('stickyNote'));
      const xs = list.map(n => n.position[0]), ys = list.map(n => n.position[1]);
      box = { x: Math.min(...xs) - 40, y: Math.min(...ys) - 30, w: Math.max(...xs) - Math.min(...xs) + N + 80, h: Math.max(...ys) - Math.min(...ys) + N + 90 };
      edgesLayer.setAttribute('viewBox', `${box.x} ${box.y} ${box.w} ${box.h}`);
      Object.assign(edgesLayer.style, { left: box.x + 'px', top: box.y + 'px', width: box.w + 'px', height: box.h + 'px' });
      list.forEach(n => {
        const type = n.type.split('.').pop();
        const outs = Math.max(1, (wf.connections[n.name]?.main || []).length, type === 'if' || type === 'splitInBatches' ? 2 : 1);
        const node = el('div', 'nc-node');
        node.classList.toggle('trigger', /Trigger$/.test(type));
        node.classList.toggle('off', !!n.disabled);
        node.style.left = n.position[0] + 'px'; node.style.top = n.position[1] + 'px';
        const ic = el('i', 'nc-icon'); const url = `url("${ASSETS}icons/${ICONS[type] || 'cpu'}.svg")`; ic.style.webkitMaskImage = url; ic.style.maskImage = url;
        node.append(ic, el('b', 'nc-check', '✓'), el('em', 'nc-runs'), el('span', 'nc-name', n.name));
        node.title = n.name + (n.disabled ? (pl ? ' (wyłączony)' : ' (disabled)') : '');
        world.append(node);
        nodes.set(n.name, { el: node, x: n.position[0], y: n.position[1], outs, runs: 0 });
      });
      Object.entries(wf.connections).forEach(([from, c]) => (c.main || []).forEach((targets, o) => (targets || []).forEach(target => {
        const a = nodes.get(from), b = nodes.get(target.node); if (!a || !b) return;
        const sx = a.x + N, sy = a.y + N * (o + 1) / (a.outs + 1), tx = b.x, ty = b.y + N / 2;
        const d = tx > sx + 30 ? `M${sx},${sy} C${sx + Math.max(40, (tx - sx) / 2)},${sy} ${tx - Math.max(40, (tx - sx) / 2)},${ty} ${tx},${ty}` : `M${sx},${sy} C${sx + 160},${sy + 190} ${tx - 160},${ty + 190} ${tx},${ty}`;
        const path = svg('path', { d, class: 'nc-edge' });
        const label = svg('text', { class: 'nc-count', 'text-anchor': 'middle' });
        const g = svg('g'); g.append(path, label); edgesLayer.append(g);
        edges.push({ from, o, to: target.node, path, label, g });
      })));
      fit(false);
    }
    function reset() { nodes.forEach(n => { n.runs = 0; n.el.classList.remove('run', 'ok'); n.el.querySelector('.nc-runs').textContent = ''; }); edges.forEach(e => { e.g.classList.remove('live', 'done'); e.label.textContent = ''; }); }
    function step(name, from) {
      nodes.forEach(n => n.el.classList.remove('run'));
      const n = nodes.get(name); if (!n) return;
      n.runs++; n.el.classList.add('run', 'ok');
      if (n.runs > 1) n.el.querySelector('.nc-runs').textContent = '×' + n.runs;
      edges.forEach(e => e.g.classList.toggle('live', !!from && e.from === from.name && e.o === from.outputIndex && e.to === name));
      const e = edges.find(e => from && e.from === from.name && e.o === from.outputIndex && e.to === name); if (e) e.g.classList.add('done');
    }
    function finish(runData) {
      nodes.forEach(n => n.el.classList.remove('run'));
      edges.forEach(e => {
        e.g.classList.remove('live');
        const runs = runData.get(e.from); if (!runs) return;
        const count = runs.reduce((sum, r) => sum + (r.outputs?.[e.o]?.length || 0), 0);
        if (!count) return;
        e.g.classList.add('done');
        const p = e.path.getPointAtLength(e.path.getTotalLength() / 2);
        e.label.setAttribute('x', p.x); e.label.setAttribute('y', p.y - 8);
        e.label.textContent = `${count} ${plural(count, t.item1 || 'item', t.item2 || 'items', t.item5 || 'items')}`;
      });
    }
    // drag to pan, buttons to zoom and fit
    let drag = null;
    view.addEventListener('pointerdown', e => { if (e.target.closest('button,a,label')) return; e.preventDefault(); drag = { x: e.clientX - cam.x, y: e.clientY - cam.y }; view.setPointerCapture(e.pointerId); view.classList.add('grab'); });
    view.addEventListener('pointermove', e => { if (!drag) return; cam.x = e.clientX - drag.x; cam.y = e.clientY - drag.y; apply(false); });
    view.addEventListener('pointerup', () => { drag = null; view.classList.remove('grab'); });
    const zoom = k => { const w = view.clientWidth / 2, h = view.clientHeight / 2, s = Math.min(1.4, Math.max(0.15, cam.s * k)); cam.x = w - (w - cam.x) * s / cam.s; cam.y = h - (h - cam.y) * s / cam.s; cam.s = s; apply(true); };
    // wheel zooms only while the pointer is over the canvas; the page does not scroll then
    view.addEventListener('wheel', e => {
      e.preventDefault();
      const r = view.getBoundingClientRect(), px = e.clientX - r.left, py = e.clientY - r.top;
      const s = Math.min(1.4, Math.max(0.08, cam.s * Math.exp(-e.deltaY * (e.deltaMode ? 0.05 : 0.0015))));
      cam.x = px - (px - cam.x) * s / cam.s; cam.y = py - (py - cam.y) * s / cam.s; cam.s = s; apply(false);
    }, { passive: false });
    view.querySelector('[data-z=in]').addEventListener('click', () => zoom(1.25));
    view.querySelector('[data-z=out]').addEventListener('click', () => zoom(0.8));
    view.querySelector('[data-z=fit]').addEventListener('click', () => fit(true));
    addEventListener('resize', () => fit(false));
    return { load, reset, step, finish, fit, focus };
  }

  document.querySelectorAll('[data-runner]').forEach(fig => {
    const cfg = data.runners?.[Number(fig.dataset.runner)];
    if (!cfg) return;
    const t = cfg.text || {};
    const picks = [...fig.querySelectorAll('.rn-pick')];
    const files = fig.querySelector('.rn-files');
    const upload = fig.querySelector('.rn-upload'), input = upload.querySelector('input'), drop = fig.querySelector('.rn-drop');
    const status = fig.querySelector('.nc-status');
    const buttons = [...fig.querySelectorAll('.rn-btn')];
    const canvas = Canvas(fig.querySelector('.nc-view'), t);
    let current = 0, busy = false, runs = 0, urls = [], ready = false;
    const engines = new Map();

    function choose(n) {
      current = n; runs = 0;
      picks.forEach((p, k) => p.setAttribute('aria-pressed', String(k === n)));
      const flow = cfg.workflows[n];
      upload.hidden = flow.upload === false;
      input.accept = flow.accept || '.csv,.tsv,.txt,.json,.xml,.xlsx,.xls,.ods,.pdf';
      files.replaceChildren();
      if (ready) canvas.load(window.N8N_WORKFLOWS[flow.id]);
      status.textContent = '';
    }
    function engineFor(M, flow) {
      if (!engines.has(flow.id)) engines.set(flow.id, new M.N8nMini(window.N8N_WORKFLOWS[flow.id], { store: M.createStore() }));
      return engines.get(flow.id);
    }
    async function run(mode, given, quiet = false) {
      if (busy) return; busy = true;
      fig.classList.add('busy'); buttons.forEach(b => b.disabled = true);
      files.replaceChildren();
      urls.forEach(u => URL.revokeObjectURL(u)); urls = [];
      try {
        const M = await loadEngine();
        if (!ready) { ready = true; canvas.load(window.N8N_WORKFLOWS[cfg.workflows[current].id]); }
        const flow = cfg.workflows[current];
        const engine = engineFor(M, flow);
        const started = performance.now();
        const result = mode === 'upload' ? await engine.runUpload(given) : await engine.runSample();
        const ms = Math.round(performance.now() - started);
        runs++;
        const summary = M.summarize(result);
        // replay the real execution order on the canvas
        canvas.reset();
        const order = result.order || [...result.runData.keys()];
        const seen = new Map();
        const delay = Math.max(28, Math.min(170, 4200 / order.length));
        status.textContent = `${t.running || 'Running'}…`;
        for (const name of quiet ? [] : order) {
          const k = seen.get(name) || 0; seen.set(name, k + 1);
          const from = result.runData.get(name)?.[k]?.from;
          canvas.step(name, from);
          if (k === 0) canvas.focus(name);
          await sleep(k === 0 ? Math.max(delay, 120) : delay);
        }
        if (quiet) order.forEach(name => canvas.step(name, null));
        canvas.finish(result.runData);
        canvas.fit(!quiet);
        status.textContent = `${order.length} ${plural(order.length, t.exec1 || 'step', t.exec2 || 'steps', t.exec5 || 'steps')} · ${ms} ms · ${t.run || 'run'} ${runs}`;
        (summary.files || []).forEach(f => {
          const url = URL.createObjectURL(new Blob([f.bytes], { type: f.mimeType || 'text/csv' })); urls.push(url);
          const a = el('a', 'rn-file', f.fileName); a.href = url; a.download = f.fileName; files.append(a);
        });
        if (summary.error) status.textContent = String(summary.error.message || summary.error);
      } catch (error) {
        status.textContent = (t.failed || 'Could not run') + ': ' + (error?.message || error);
      }
      fig.classList.remove('busy'); buttons.forEach(b => b.disabled = false);
      busy = false;
    }
    const readFiles = list => Promise.all([...list].map(async f => ({ name: f.name, type: f.type, data: new Uint8Array(await f.arrayBuffer()) })));
    picks.forEach((p, n) => p.addEventListener('click', () => { if (!busy) { engines.delete(cfg.workflows[n].id); choose(n); run('sample'); } }));
    fig.querySelector('[data-act=sample]').addEventListener('click', () => run('sample'));
    input.addEventListener('change', async () => { if (input.files.length) run('upload', await readFiles(input.files)); input.value = ''; });
    const hasFiles = e => [...(e.dataTransfer?.types || [])].includes('Files');
    fig.addEventListener('dragover', e => { if (upload.hidden || !hasFiles(e)) return; e.preventDefault(); drop.hidden = false; });
    fig.addEventListener('dragleave', e => { if (!fig.contains(e.relatedTarget)) drop.hidden = true; });
    fig.addEventListener('drop', async e => { if (upload.hidden || !hasFiles(e)) return; e.preventDefault(); drop.hidden = true; if (e.dataTransfer.files.length) run('upload', await readFiles(e.dataTransfer.files)); });
    choose(0);
    onView(fig, () => loadEngine().then(() => { if (!ready) { ready = true; canvas.load(window.N8N_WORKFLOWS[cfg.workflows[current].id]); } }).catch(() => {}), 0, '900px 0px');
    onView(fig, () => run('sample', null, true), 0.4);
  });
})();
