'use strict';
(() => {
  // Asset folder of this script, so the article works at any URL and inside a host site.
  const ASSETS = (document.currentScript && document.currentScript.src || '').replace(/[^/]*$/, '') || 'assets/';
  const dataNode = document.getElementById('article-data');
  const data = dataNode ? JSON.parse(dataNode.textContent) : {};
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const icon = name => {
    const image = document.createElement('img');
    image.className = 'icon'; image.src = ASSETS + 'icons/' + name + '.svg';
    image.width = 20; image.height = 20; image.alt = '';
    image.setAttribute('aria-hidden', 'true'); return image;
  };
  const text = (tag, value, className) => {
    const node = document.createElement(tag); node.textContent = value;
    if (className) node.className = className;
    return node;
  };
  const rail = document.getElementById('step-rail');
  const explainer = document.getElementById('step-explainer');
  const play = document.getElementById('play-flow');
  const flowKeys = Object.keys(data.flows || {});
  let flow = flowKeys[0], step = 0, renderedFlow = null, timer = null, stepMotion = null;
  function stopPlayback() {
    clearInterval(timer); timer = null;
    if (play) {
      play.replaceChildren(icon('play'), text('span', data.ui.play));
      play.setAttribute('aria-pressed', 'false');
    }
  }
  function renderFlow() {
    if (!rail || !flow) return;
    const entries = data.flows[flow].steps;
    if (renderedFlow !== flow) {
      rail.replaceChildren();
      entries.forEach((entry, index) => {
        const item = document.createElement('li'), button = document.createElement('button');
        const disc = document.createElement('span'); disc.className = 'disc';
        disc.append(icon(entry.icon));
        button.type = 'button'; button.className = 'step'; button.dataset.step = String(index);
        button.setAttribute('aria-label', [entry.title, entry.code].filter(Boolean).join(' ') + ': ' + entry.heading);
        button.append(disc, text('b', entry.title), document.createTextNode(' '), text('small', entry.code || ''));
        button.addEventListener('click', () => { stopPlayback(); step = index; renderFlow(); });
        item.append(button); rail.append(item);
      });
      renderedFlow = flow;
    }
    [...rail.children].forEach((item, index) => {
      item.classList.toggle('done', index < step);
      item.firstElementChild.classList.toggle('selected', index === step);
      item.firstElementChild.setAttribute('aria-pressed', String(index === step));
    });
    const entry = entries[step];
    explainer.replaceChildren(text('h3', entry.heading), text('p', entry.text));
    stepMotion?.cancel();
    if (!reduced.matches && explainer.animate) {
      stepMotion = explainer.animate([{ opacity: .94, transform: 'translateY(1px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 150, easing: 'ease-out' });
    }
    document.getElementById('step-count').textContent = (step + 1) + ' / ' + entries.length;
    document.querySelectorAll('[data-flow]').forEach(button => {
      const selected = button.dataset.flow === flow;
      button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1;
    });
    document.getElementById('pipeline-panel').setAttribute('aria-labelledby', 'tab-' + flow);
  }
  if (rail && flowKeys.length) {
    const tabs = [...document.querySelectorAll('[data-flow]')];
    tabs.forEach((button, index) => {
      button.addEventListener('click', () => { stopPlayback(); flow = button.dataset.flow; step = 0; renderFlow(); });
      button.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowLeft' ? -1 : 1) + tabs.length) % tabs.length;
        tabs[next].click(); tabs[next].focus();
      });
    });
    document.getElementById('next-step').addEventListener('click', () => { stopPlayback(); step = (step + 1) % data.flows[flow].steps.length; renderFlow(); });
    play.addEventListener('click', () => {
      if (timer) { stopPlayback(); return; }
      if (step === data.flows[flow].steps.length - 1) step = 0;
      renderFlow(); play.replaceChildren(icon('pause'), text('span', data.ui.pause));
      play.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => {
        step++; renderFlow();
        if (step >= data.flows[flow].steps.length - 1) stopPlayback();
      }, 2300);
    });
    stopPlayback(); renderFlow();
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stopPlayback(); });

  const tooltip = document.getElementById('glossary-tooltip');
  let tipTrigger = null;
  function hideTip() {
    if (!tooltip) return;
    tooltip.classList.remove('visible'); tooltip.hidden = true;
    if (tipTrigger) { tipTrigger.setAttribute('aria-expanded', 'false'); tipTrigger.removeAttribute('aria-describedby'); }
    tipTrigger = null;
  }
  function placeOverlay(button, panel, gap) {
    const source = button.getBoundingClientRect(), box = panel.getBoundingClientRect();
    panel.style.left = Math.max(14, Math.min(innerWidth - box.width - 14, source.left + source.width / 2 - box.width / 2)) + 'px';
    panel.style.top = (source.bottom + gap + box.height < innerHeight - 14 ? source.bottom + gap : Math.max(14, source.top - box.height - gap)) + 'px';
  }
  function showTip(button) {
    const entry = data.glossary?.[button.dataset.term];
    if (!entry || !tooltip) return;
    hideTip(); tipTrigger = button;
    tooltip.replaceChildren(text('b', entry.title), text('span', entry.text));
    tooltip.hidden = false; placeOverlay(button, tooltip, 12);
    button.setAttribute('aria-expanded', 'true'); button.setAttribute('aria-describedby', tooltip.id);
    tooltip.classList.add('visible');
  }
  document.querySelectorAll('[data-term]').forEach(button => {
    const entry = data.glossary?.[button.dataset.term];
    if (entry?.icon) button.prepend(icon(entry.icon));
    button.setAttribute('aria-expanded', 'false');
    button.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showTip(button); });
    button.addEventListener('pointerleave', () => { if (document.activeElement !== button) hideTip(); });
    button.addEventListener('focus', () => showTip(button));
    button.addEventListener('blur', hideTip);
    button.addEventListener('click', () => {
      if (tipTrigger === button && button.dataset.tapped === 'true') { hideTip(); button.dataset.tapped = 'false'; }
      else { showTip(button); button.dataset.tapped = 'true'; }
    });
  });
  document.querySelectorAll('.graph-node').forEach(node => {
    function select() {
      const entry = data.graph?.nodes.find(item => item.id === node.dataset.node);
      if (!entry) return;
      document.querySelectorAll('.graph-node').forEach(other => {
        other.classList.toggle('selected', other === node); other.setAttribute('aria-pressed', String(other === node));
      });
      document.getElementById('graph-detail').replaceChildren(text('b', entry.title), text('p', entry.text));
    }
    node.addEventListener('click', select);
    node.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); select(); } });
  });
  document.querySelectorAll('[data-edge]').forEach(button => button.addEventListener('click', () => {
    document.querySelectorAll('[data-edge]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    document.querySelectorAll('.graph-edge').forEach(edge => { edge.style.opacity = button.dataset.edge === 'all' || edge.classList.contains(button.dataset.edge) ? '1' : '.1'; });
  }));
  const faq = [...document.querySelectorAll('.facts details')];
  faq.forEach(item => item.addEventListener('toggle', () => { if (item.open) faq.forEach(other => { if (other !== item) other.open = false; }); }));

  const authorButton = document.getElementById('author-button'), authorCard = document.getElementById('author-card');
  let closeTimer = null, pinned = false;
  const cancelClose = () => { clearTimeout(closeTimer); closeTimer = null; };
  function hideAuthor() { cancelClose(); pinned = false; if (authorCard) authorCard.hidden = true; authorButton?.setAttribute('aria-expanded', 'false'); }
  function showAuthor() { cancelClose(); authorCard.hidden = false; authorButton.setAttribute('aria-expanded', 'true'); placeOverlay(authorButton, authorCard, 8); }
  function scheduleClose() { if (pinned) return; cancelClose(); closeTimer = setTimeout(() => { if (!authorCard.contains(document.activeElement)) hideAuthor(); }, 200); }
  if (authorButton && authorCard) {
    authorButton.addEventListener('pointerenter', event => { if (event.pointerType !== 'touch') showAuthor(); });
    authorButton.addEventListener('pointerleave', scheduleClose);
    authorButton.addEventListener('focus', showAuthor);
    authorButton.addEventListener('blur', event => { if (!authorCard.contains(event.relatedTarget)) scheduleClose(); });
    authorButton.addEventListener('click', () => { if (pinned) { hideAuthor(); return; } pinned = true; showAuthor(); });
    authorButton.addEventListener('keydown', event => { if (event.key === 'ArrowDown') { event.preventDefault(); showAuthor(); (authorCard.querySelector('a') || authorCard).focus(); } });
    authorCard.addEventListener('pointerenter', cancelClose);
    authorCard.addEventListener('pointerleave', scheduleClose);
    authorCard.addEventListener('focusin', cancelClose);
    authorCard.addEventListener('focusout', event => { if (event.relatedTarget !== authorButton && !authorCard.contains(event.relatedTarget)) scheduleClose(); });
  }
  document.addEventListener('pointerdown', event => {
    if (!event.target.closest('[data-term]')) hideTip();
    if (authorCard && !authorCard.contains(event.target) && !authorButton.contains(event.target)) hideAuthor();
  });
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    hideTip();
    if (authorCard && !authorCard.hidden) { if (authorCard.contains(document.activeElement)) authorButton.focus({ preventScroll: true }); hideAuthor(); }
  });
  window.addEventListener('resize', () => { hideTip(); hideAuthor(); });
  document.addEventListener('wheel', event => { hideTip(); if (!authorCard?.contains(event.target)) hideAuthor(); }, { passive: true });
  document.addEventListener('touchmove', hideTip, { passive: true });

  const sections = [...document.querySelectorAll('.article section')];
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      entry.target.classList.remove('pending');
      document.querySelectorAll('.toc a').forEach(link => {
        const active = link.hash === '#' + entry.target.id;
        link.classList.toggle('active', active);
        if (active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current');
      });
    }), { rootMargin: '-5% 0px -45% 0px', threshold: 0 });
    sections.forEach(section => { if (!reduced.matches) section.classList.add('pending'); observer.observe(section); });
  }
  reduced.addEventListener('change', () => { if (reduced.matches) { stopPlayback(); stepMotion?.cancel(); sections.forEach(section => section.classList.remove('pending')); } });
  const readingTime = document.getElementById('reading-time'), article = document.querySelector('.article');
  if (readingTime && article) readingTime.textContent = Math.max(1, Math.ceil(article.textContent.trim().split(/\s+/).length / 210)) + ' min';
  const progress = document.querySelector('.progress');
  if (progress) {
    const fill = progress.firstElementChild;
    let queued = false;
    const draw = () => {
      queued = false;
      const room = document.documentElement.scrollHeight - innerHeight;
      fill.style.transform = 'scaleX(' + (room > 0 ? Math.min(1, Math.max(0, scrollY / room)) : 1) + ')';
    };
    const queue = () => { if (!queued) { queued = true; requestAnimationFrame(draw); } };
    addEventListener('scroll', queue, { passive: true });
    addEventListener('resize', queue);
    addEventListener('load', queue);
    draw();
  }
})();
