// Embeds a rendered article into a host site (its header, footer, fonts, colours, theme).
// Run from the host project root; postcss is resolved from the host's node_modules.
//
//   node <skill>/scripts/embed_site.mjs --from public/realizacje/<slug> \
//     --content src/content/case-studies/<slug> --css src/components/CaseStudyArticle.css \
//     --tokens <site-tokens.json>
//
// Writes <content>/{pl,en}.json ({title, description, html, data}) and one CSS file whose
// rules are scoped under the wrapper class and read the host's own colour variables.
// See references/site-embed.md for the tokens file and the mounting component.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => (value.startsWith("--") ? [...pairs, [value.slice(2), all[index + 1]]] : pairs), []));
for (const key of ["from", "content", "css", "tokens"]) if (!args[key]) throw new Error(`missing --${key}; see the header of this file`);
const postcss = createRequire(path.resolve("package.json"))("postcss");
const site = JSON.parse(fs.readFileSync(args.tokens, "utf8"));
const scopeClass = site.scope || ".ea";
const root = path.resolve(args.from);
fs.mkdirSync(path.resolve(args.content), { recursive: true });

// ---------- markup per language ----------
const pages = { pl: "pl.html", en: "index.html" };
for (const [lang, file] of Object.entries(pages)) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) continue;
  const html = fs.readFileSync(source, "utf8");
  const body = html.slice(html.indexOf("<body>") + 6, html.lastIndexOf("</body>"));
  const data = /<script type="application\/json" id="article-data">([\s\S]*?)<\/script>/.exec(body)?.[1];
  if (!data) throw new Error(`${file}: article-data missing`);
  if (/="assets\//.test(body)) throw new Error(`${file}: relative asset paths; render with --base-url`);
  const markup = body.replace(/<a class="skip"[^>]*>[\s\S]*?<\/a>/, "").replace(/<script[\s\S]*?<\/script>/g, "").trim();
  const title = /<title>([^<]*)<\/title>/.exec(html)?.[1] ?? "";
  const description = /<meta name="description" content="([^"]*)"/.exec(html)?.[1] ?? "";
  fs.writeFileSync(path.resolve(args.content, `${lang}.json`), JSON.stringify({ title, description, html: markup, data: JSON.parse(data) }));
}

// ---------- styles scoped under the wrapper ----------
const THEME = new Set(["--paper", "--ink", "--body", "--muted", "--faint", "--line", "--accent", "--tint", "--card", "--signal"]);
const darkSelector = site.dark?.selector || "html[data-theme=dark]";
const scope = (selector) => {
  if (selector.includes("has-dark")) {
    if (selector.includes(":not([data-theme=light])")) return null; // system-preference variant: the host decides
    return selector.replace(/html\.has-dark\[data-theme=dark\]/, `${darkSelector} ${scopeClass}`).replace(/html\.has-dark/, scopeClass);
  }
  if (/^(:root|html|body)$/.test(selector)) return scopeClass;
  if (/^(:root|html|body)[\s:.[]/.test(selector)) return selector.replace(/^(:root|html|body)/, scopeClass);
  return `${scopeClass} ${selector}`;
};
const css = ["article.css", "figures.css"].map((name) => fs.readFileSync(path.join(root, "assets", name), "utf8")).join("\n");
const ast = postcss.parse(css);
ast.walkAtRules((rule) => {
  if (rule.name === "font-face" && site.fonts) rule.remove();
  else if (rule.name === "media" && /prefers-color-scheme/.test(rule.params) && site.dark) rule.remove();
});
const offset = `${site.headerOffset ?? 0}px`;
ast.walkRules((rule) => {
  if (rule.parent?.type === "atrule" && /keyframes/.test(rule.parent.name)) return;
  const isRoot = rule.selectors.some((selector) => /^(:root|html|body)$/.test(selector));
  const scoped = rule.selectors.map(scope).filter(Boolean);
  if (!scoped.length) { rule.remove(); return; }
  rule.selectors = scoped;
  rule.walkDecls((decl) => {
    if (isRoot && THEME.has(decl.prop)) decl.remove();
    else if (decl.prop === "font-family" && site.fonts) decl.value = /Consolas|mono/i.test(decl.value) ? site.fonts.mono : site.fonts.body;
    else if (decl.prop === "scroll-margin-top" && site.headerOffset) decl.value = `calc(${decl.value} + ${offset})`;
  });
  if (!rule.nodes.length) rule.remove();
});
const decls = (tokens = {}) => Object.entries(tokens).map(([key, value]) => `--${key}:${value}`).join(";");
const bridge = [
  `${scopeClass}{${decls(site.light)};background:var(--paper);color:var(--ink)${site.fonts ? `;font-family:${site.fonts.body}` : ""}}`,
  site.dark ? `${darkSelector} ${scopeClass}{${decls(site.dark.tokens)}}` : "",
  site.dark ? `${darkSelector} ${scopeClass} .icon{filter:invert(.9)}${darkSelector} ${scopeClass} .control.primary .icon,${darkSelector} ${scopeClass} .sc-node.on .sc-disc .icon{filter:none}` : "",
  site.fonts?.display ? `${scopeClass} h1,${scopeClass} h2{font-family:${site.fonts.display}}` : "",
  // Host sites often own a global .reveal class; keep article sections visible once revealed.
  `${scopeClass} .reveal:not(.pending){opacity:1;transform:none}`,
  `${scopeClass} .progress{z-index:${site.progressZ ?? 60}}`,
  site.headerOffset ? `${scopeClass} .sidebar{top:${offset}}` : "",
  site.extraCss || "",
].filter(Boolean).join("\n");
const header = `/* generated by editorial-article embed_site.mjs from ${args.from}; do not edit */\n`;
fs.writeFileSync(path.resolve(args.css), header + ast.toString() + "\n/* host bridge */\n" + bridge + "\n");
console.log(`embedded ${args.from}: content in ${args.content}, styles in ${args.css}`);
