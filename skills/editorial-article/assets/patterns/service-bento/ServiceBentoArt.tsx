/*
 * Mini-UI illustrations for the service bento. Every scene is drawn on a fixed design stage (420 or 640 x 260 px)
 * that ServiceBento scales to the cell. Positions are in stage pixels, so connector paths and the cursor line up.
 * Static markup is the final state of each story; the CSS loop (ServiceBento.css) only runs when motion is allowed.
 * Sample data only: no clients, results or integrations beyond what the guides describe.
 */
import type { CSSProperties, ReactNode } from "react";
import type { BentoArt } from "@/lib/serviceBento";

type Pt = { x: number; y: number; w?: number; h?: number };
const at = ({ x, y, w, h }: Pt, extra?: CSSProperties): CSSProperties => ({ left: x, top: y, width: w, height: h, ...extra });

const ICONS: Record<string, ReactNode> = {
  check: <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />,
  x: <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />,
  phone: <path d="M5.2 2.5h-1.7a1 1 0 0 0-1 1.1A11 11 0 0 0 12.4 13.5a1 1 0 0 0 1.1-1v-1.7a1 1 0 0 0-.8-1l-2-.5a1 1 0 0 0-1 .3l-.7.8a8 8 0 0 1-3.5-3.5l.8-.7a1 1 0 0 0 .3-1l-.5-2a1 1 0 0 0-1-.8Z" />,
  cal: <><rect x="2.5" y="3.5" width="11" height="10" rx="2" /><path d="M2.5 6.5h11M5.5 2v3M10.5 2v3" /></>,
  doc: <><path d="M4 1.8h5.2L12.5 5v9.2H4Z" /><path d="M9 1.8V5h3.5M6 8h4.5M6 10.5h4.5" /></>,
  mail: <><rect x="2" y="3.5" width="12" height="9" rx="1.8" /><path d="m2.5 4.5 5.5 4.2 5.5-4.2" /></>,
  bolt: <path d="M8.8 1.8 3.8 9h3.6l-.6 5.2 5-7.2H8.2Z" />,
  user: <><circle cx="8" cy="5.5" r="2.6" /><path d="M3 14c.6-2.8 2.6-4.3 5-4.3s4.4 1.5 5 4.3" /></>,
  table: <><rect x="2.2" y="2.5" width="11.6" height="11" rx="1.8" /><path d="M2.2 6.2h11.6M2.2 9.9h11.6M6.5 6.2v7.3" /></>,
  cart: <><path d="M1.8 2.5h1.8l1.6 8h7.2l1.4-5.6H4.4" /><circle cx="6.2" cy="13.2" r=".9" /><circle cx="11.4" cy="13.2" r=".9" /></>,
  book: <><path d="M3 3.2c1.8-.8 3.5-.8 5 .4 1.5-1.2 3.2-1.2 5-.4v9.6c-1.8-.8-3.5-.8-5 .4-1.5-1.2-3.2-1.2-5-.4Z" /><path d="M8 3.6v9.6" /></>,
  people: <><circle cx="5.8" cy="5.6" r="2.2" /><path d="M1.8 13.4c.4-2.3 2-3.6 4-3.6s3.6 1.3 4 3.6" /><path d="M10.4 3.6a2.2 2.2 0 0 1 0 4.2M12 9.9c1.2.5 2 1.7 2.2 3.5" /></>,
  cam: <><rect x="1.8" y="4.2" width="9" height="7.6" rx="1.6" /><path d="m10.8 7 3.4-2v6l-3.4-2" /></>,
  spark: <path d="M8 1.8c.4 3.1 1.7 4.4 4.8 4.8-3.1.4-4.4 1.7-4.8 4.8-.4-3.1-1.7-4.4-4.8-4.8 3.1-.4 4.4-1.7 4.8-4.8ZM12.6 10.8c.2 1.3.7 1.8 2 2-1.3.2-1.8.7-2 2-.2-1.3-.7-1.8-2-2 1.3-.2 1.8-.7 2-2Z" />,
};

export function Ico({ name, className }: { name: keyof typeof ICONS; className?: string }) {
  return (
    <svg className={`bx-ico${className ? ` ${className}` : ""}`} viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      {ICONS[name]}
    </svg>
  );
}

function Cursor({ from, to }: { from: [number, number]; to: [number, number] }) {
  const style = { "--sx": `${from[0]}px`, "--sy": `${from[1]}px`, "--cx": `${to[0]}px`, "--cy": `${to[1]}px` } as CSSProperties;
  return (
    <svg className="bx-cursor" style={style} width="20" height="22" viewBox="0 0 20 22" aria-hidden="true">
      <path d="M3 2.2v15.6l4.2-3.9 2.7 6 2.6-1.2-2.7-5.9h5.8Z" fill="var(--bx-ink)" stroke="var(--bx-card)" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

function Toast({ p, t, children, tone = "ok" }: { p: Pt; t: number; children: ReactNode; tone?: "ok" | "warn" }) {
  return (
    <div className={`bx-card bx-toast bx-p2 bx-t${t}`} style={at(p)}>
      <span className={`bx-toast-mark is-${tone}`}><Ico name={tone === "ok" ? "check" : "x"} /></span>
      <span>{children}</span>
    </div>
  );
}

/* Thin connector lines drawn in stage coordinates. */
function Wires({ paths, t = 15 }: { paths: string[]; t?: number }) {
  return (
    <svg className="bx-wires" viewBox="0 0 640 260" width="640" height="260" aria-hidden="true">
      {paths.map((d, i) => <path key={i} d={d} pathLength={1} className={`bx-wire bx-d${t}`} />)}
    </svg>
  );
}

/* Dots travelling along a path (CSS offset-path, stage coordinates). */
function Dot({ d, t }: { d: string; t: number }) {
  return <span className={`bx-dot bx-go${t}`} style={{ offsetPath: `path("${d}")` }} />;
}

function Wave({ bars = 18 }: { bars?: number }) {
  const heights = [0.35, 0.6, 0.9, 0.55, 0.75, 1, 0.65, 0.4, 0.8, 0.95, 0.5, 0.7, 0.45, 0.85, 0.6, 0.35, 0.55, 0.3];
  return (
    <span className="bx-wave" aria-hidden="true">
      {heights.slice(0, bars).map((h, i) => <i key={i} style={{ "--h": h, "--i": i } as CSSProperties} />)}
    </span>
  );
}

type L = (pl: string, en: string) => string;

function CallArt({ l }: { l: L }) {
  const steps = [l("Słucha", "Listening"), l("Rozumie", "Understanding"), l("Umawia", "Booking")];
  return (
    <>
      <Wires t={15} paths={["M206 128 C228 128 228 80 252 80", "M206 128 H252", "M206 128 C228 128 228 176 252 176", "M392 80 C414 80 414 128 432 128", "M392 128 H432", "M392 176 C414 176 414 128 432 128"]} />
      <div className="bx-card bx-p1 bx-call" style={at({ x: 16, y: 72, w: 190 })}>
        <div className="bx-row">
          <span className="bx-icon-dot is-copper"><Ico name="phone" /></span>
          <span className="bx-stack"><b>{l("Połączenie odebrane", "Call answered")}</b><small>{l("Ebi, asystent głosowy", "Ebi, voice assistant")}</small></span>
        </div>
        <Wave />
      </div>
      {steps.map((s, i) => (
        <div key={s} className={`bx-pill bx-step bx-p1`} style={at({ x: 252, y: 62 + i * 48, w: 140 })}>
          <span className={`bx-step-mark bx-t${[15, 25, 35][i]}`}><Ico name="check" /></span>
          <span className="bx-step-num">{i + 1}</span>
          {s}
        </div>
      ))}
      <div className="bx-card bx-p2 bx-t45" style={at({ x: 432, y: 64, w: 192 })}>
        <div className="bx-row bx-muted"><Ico name="cal" />{l("Wizyta umówiona", "Visit booked")}</div>
        <div className="bx-big">{l("Jutro, 10:30", "Tomorrow, 10:30")}</div>
        <div className="bx-muted bx-small">{l("Wpisana do kalendarza", "Added to the calendar")}</div>
      </div>
      <Toast p={{ x: 444, y: 176 }} t={65}>{l("Notatka dla zespołu w panelu", "Note for the team in the panel")}</Toast>
    </>
  );
}

function SourcesArt({ l }: { l: L }) {
  return (
    <div className="bx-card bx-chat bx-p1" style={at({ x: 24, y: 14, w: 372, h: 232 })}>
      <div className="bx-chat-head"><span className="bx-icon-dot is-copper"><Ico name="book" /></span><b>{l("Asystent firmy", "Company assistant")}</b><small>{l("baza wiedzy", "knowledge base")}</small></div>
      <div className="bx-scene bx-scene-a">
        <p className="bx-bubble is-user bx-t5">{l("Ile mam dni na zwrot towaru?", "How many days do I have to return an item?")}</p>
        <p className="bx-bubble bx-t15">{l("Masz 14 dni od odbioru paczki.", "You have 14 days from receiving the parcel.")} <span className="bx-cite">1</span></p>
        <div className="bx-source bx-t25"><Ico name="doc" /><span className="bx-stack"><b>{l("Regulamin sklepu.pdf", "Store terms.pdf")}</b><small>{l("§ 7. Zwroty", "§ 7. Returns")}</small></span></div>
      </div>
      <div className="bx-scene bx-scene-b" aria-hidden="true">
        <p className="bx-bubble is-user bx-t55">{l("Czy wysyłacie do Norwegii?", "Do you ship to Norway?")}</p>
        <p className="bx-bubble bx-t65">{l("Nie wiem. W bazie nie ma tej informacji, więc przekażę pytanie zespołowi.", "I don't know. The knowledge base doesn't say, so I'll pass the question to the team.")}</p>
        <span className="bx-chip is-warn bx-t75">{l("Brak źródła, bez zgadywania", "No source, no guessing")}</span>
      </div>
    </div>
  );
}

function InboxArt({ l }: { l: L }) {
  const rows = [
    { i: "MW", who: "Marta Wójcik", what: l("Termin wizyty w czwartek", "Visit on Thursday"), tag: l("Grafik", "Schedule"), t: 15 },
    { i: "HB", who: l("Hurtownia biurowa", "Office wholesaler"), what: l("Faktura za październik", "October invoice"), tag: l("Księgowość", "Accounts"), t: 25 },
    { i: "PZ", who: "Paweł Zając", what: l("Drukarka nie drukuje", "Printer not printing"), tag: l("Serwis", "Service"), t: 35 },
  ];
  return (
    <>
      <div className="bx-card bx-inbox bx-p1" style={at({ x: 14, y: 12, w: 392 })}>
        <div className="bx-row bx-spread"><span className="bx-row"><Ico name="mail" /><b>{l("Skrzynka", "Inbox")}</b></span><span className="bx-chip">{l("3 nowe", "3 new")}</span></div>
        {rows.map(r => (
          <div key={r.i} className="bx-mail">
            <span className="bx-avatar">{r.i}</span>
            <span className="bx-stack"><b>{r.who}</b><small>{r.what}</small></span>
            <span className={`bx-chip is-copper bx-t${r.t}`}>{r.tag}</span>
          </div>
        ))}
      </div>
      <div className="bx-card bx-draft bx-p2 bx-t35" style={at({ x: 14, y: 138, w: 232 })}>
        <div className="bx-row bx-spread"><b>{l("Szkic odpowiedzi", "Draft reply")}</b><span className="bx-chip">{l("do akceptacji", "needs approval")}</span></div>
        <p className="bx-small">{l("Czwartek o 12:00 jest wolny. Pasuje?", "Thursday at 12:00 is free. Does it suit you?")}</p>
        <div className="bx-row bx-end"><span className="bx-btn">{l("Edytuj", "Edit")}</span><span className="bx-btn is-primary bx-press">{l("Wyślij", "Send")}</span></div>
      </div>
      <Cursor from={[330, 250]} to={[210, 216]} />
      <Toast p={{ x: 232, y: 206 }} t={55}>{l("Wysłane po akceptacji", "Sent after approval")}</Toast>
    </>
  );
}

function SummaryArt({ l }: { l: L }) {
  const lines = [
    { who: l("Klient", "Caller"), say: l("Drukarka w biurze od rana nie drukuje.", "The office printer hasn't printed since morning."), t: 5 },
    { who: "Ebi", say: l("Rozumiem. Czy pokazuje jakiś komunikat?", "I see. Does it show any message?"), t: 15 },
    { who: l("Klient", "Caller"), say: l("Brak papieru, a papier jest.", "Out of paper, but there is paper."), t: 25 },
  ];
  return (
    <>
      <Wires t={35} paths={["M318 130 H362"]} />
      <Dot d="M318 130 H362" t={35} />
      <div className="bx-card bx-p1" style={at({ x: 16, y: 26, w: 302 })}>
        <div className="bx-row bx-spread"><span className="bx-row"><Ico name="phone" /><b>{l("Zapis rozmowy", "Call transcript")}</b></span><Wave bars={8} /></div>
        {lines.map((x, i) => (
          <p key={i} className={`bx-line bx-t${x.t}`}><span>{x.who}</span>{x.say}</p>
        ))}
      </div>
      <div className="bx-card bx-p2 bx-t35" style={at({ x: 362, y: 24, w: 262 })}>
        <div className="bx-row"><span className="bx-icon-dot is-copper"><Ico name="spark" /></span><b>{l("Podsumowanie rozmowy", "Call summary")}</b></div>
        <dl className="bx-fields">
          <div className="bx-t45"><dt>{l("Temat", "Topic")}</dt><dd>{l("Drukarka, błąd papieru", "Printer, paper error")}</dd></div>
          <div className="bx-t55"><dt>{l("Ustalenie", "Agreed")}</dt><dd>{l("Serwis oddzwoni dziś", "Service calls back today")}</dd></div>
          <div className="bx-t65"><dt>{l("Kolejny krok", "Next step")}</dt><dd>{l("Zgłoszenie serwisowe", "Service ticket")}</dd></div>
        </dl>
      </div>
      <Toast p={{ x: 400, y: 196 }} t={75}>{l("Zapisane przy kliencie", "Saved to the customer")}</Toast>
    </>
  );
}

function InvoiceArt({ l }: { l: L }) {
  const fields = [
    { k: l("Numer", "Number"), v: "FV/2026/114", t: 15 },
    { k: l("NIP sprzedawcy", "Seller tax ID"), v: l("poprawny", "valid"), t: 25 },
    { k: l("Data wystawienia", "Issue date"), v: "03.11.2026", t: 35 },
    { k: l("Netto + VAT = brutto", "Net + VAT = gross"), v: l("zgadza się", "adds up"), t: 45 },
  ];
  return (
    <>
      <Wires t={15} paths={["M226 70 C260 70 262 92 300 92", "M226 132 C262 132 262 120 300 120", "M226 190 C262 190 262 148 300 148"]} />
      <div className="bx-card bx-doc bx-p1" style={at({ x: 26, y: 16, w: 200, h: 228 })}>
        <div className="bx-row bx-spread"><b>{l("Faktura", "Invoice")}</b><span className="bx-chip">PDF</span></div>
        <span className="bx-hl bx-t15" style={at({ x: 12, y: 40, h: 20 })}><i>FV/2026/114</i></span>
        <span className="bx-skel" style={at({ x: 14, y: 76, w: 150 })} />
        <span className="bx-hl bx-t25" style={at({ x: 12, y: 88, h: 20 })}><i>{l("NIP", "Tax ID")} ··· ··· ·· ··</i></span>
        <span className="bx-hl bx-t35" style={at({ x: 104, y: 118, h: 20 })}><i>03.11.2026</i></span>
        <span className="bx-skel" style={at({ x: 14, y: 150, w: 172 })} />
        <span className="bx-skel" style={at({ x: 14, y: 162, w: 128 })} />
        <span className="bx-hl bx-t45" style={at({ x: 92, y: 182, h: 22 })}><i>1 230,00 zł</i></span>
        <span className="bx-scan" />
      </div>
      <div className="bx-card bx-p2" style={at({ x: 300, y: 26, w: 300 })}>
        <div className="bx-row bx-spread"><b>{l("Odczytane pola", "Extracted fields")}</b><span className="bx-chip">{l("według reguł", "rule-based")}</span></div>
        {fields.map(f => (
          <div key={f.k} className={`bx-field bx-t${f.t}`}><span>{f.k}</span><b>{f.v}</b><span className="bx-ok"><Ico name="check" /></span></div>
        ))}
        <div className="bx-row bx-end bx-t55"><span className="bx-status is-ok">{l("Przyjęta", "Accepted")}</span></div>
      </div>
      <Toast p={{ x: 318, y: 210 }} t={70} tone="warn">{l("FV/2026/115: do poprawy, kwota niejednoznaczna", "FV/2026/115: to fix, ambiguous amount")}</Toast>
    </>
  );
}

function MatchArt({ l }: { l: L }) {
  const rows = [
    { name: l("Papier A4", "A4 paper"), a: l("20 op.", "20 packs"), b: l("20 op.", "20 packs"), ok: true, t: 15 },
    { name: "Toner", a: l("4 szt.", "4 pcs"), b: l("4 szt.", "4 pcs"), ok: true, t: 25 },
    { name: l("Segregator", "Binder"), a: "12,00 zł", b: "14,00 zł", ok: false, t: 35 },
  ];
  return (
    <>
      <div className="bx-card bx-match bx-p1" style={at({ x: 18, y: 16, w: 384 })}>
        <div className="bx-mrow is-head"><span /><span>{l("Zamówienie", "Order")}<small>ZAM/0412</small></span><span>{l("Faktura", "Invoice")}<small>FV/2026/114</small></span><span /></div>
        {rows.map(r => (
          <div key={r.name} className={`bx-mrow bx-t${r.t}${r.ok ? "" : " is-diff"}`}>
            <span>{r.name}</span><span>{r.a}</span><span>{r.b}</span>
            <span className={r.ok ? "bx-ok" : "bx-bad"}><Ico name={r.ok ? "check" : "x"} /></span>
          </div>
        ))}
      </div>
      <Toast p={{ x: 120, y: 196 }} t={50} tone="warn">{l("1 różnica do sprawdzenia", "1 difference to check")}</Toast>
    </>
  );
}

function ApprovalArt({ l }: { l: L }) {
  return (
    <>
      <div className="bx-card bx-ghost bx-p1" style={at({ x: 64, y: 30, w: 292, h: 150 })} />
      <div className="bx-card bx-p2" style={at({ x: 52, y: 18, w: 316 })}>
        <div className="bx-row bx-spread"><b>{l("Wniosek o zakup", "Purchase request")}</b><span className="bx-chip is-copper bx-t15">{l("do: kierownik biura", "to: office manager")}</span></div>
        <div className="bx-big">{l("Monitor do recepcji", "Monitor for reception")}</div>
        <div className="bx-row bx-spread bx-muted bx-small"><span className="bx-row"><Ico name="user" />Ewa Nowicka</span><b className="bx-ink">899,00 zł</b></div>
        <div className="bx-row bx-end bx-gap"><span className="bx-btn">{l("Odrzuć", "Reject")}</span><span className="bx-btn is-primary bx-press">{l("Zatwierdź", "Approve")}</span></div>
      </div>
      <Cursor from={[100, 250]} to={[326, 152]} />
      <Toast p={{ x: 96, y: 198 }} t={55}>{l("Zatwierdzone i zapisane w systemie", "Approved and saved in the system")}</Toast>
    </>
  );
}

function WebhookArt({ l }: { l: L }) {
  const outs = [
    { icon: "people" as const, label: l("CRM: nowy kontakt", "CRM: new contact"), y: 34, t: 45 },
    { icon: "table" as const, label: l("Arkusz: nowy wiersz", "Sheet: new row"), y: 106, t: 55 },
    { icon: "mail" as const, label: l("E-mail do zespołu", "Email to the team"), y: 178, t: 65 },
  ];
  const into = "M200 130 H286";
  const outPaths = ["M354 130 C392 130 392 58 432 58", "M354 130 H432", "M354 130 C392 130 392 202 432 202"];
  return (
    <>
      <Wires t={15} paths={[into, ...outPaths]} />
      <Dot d={into} t={15} />
      {outPaths.map((d, i) => <Dot key={d} d={d} t={[35, 45, 55][i]} />)}
      <div className="bx-card bx-p1" style={at({ x: 16, y: 44, w: 184 })}>
        <b>{l("Formularz na stronie", "Website form")}</b>
        <span className="bx-input bx-t5">Anna Mazur</span>
        <span className="bx-input bx-t5">anna@przyklad.pl</span>
        <div className="bx-row bx-end"><span className="bx-btn is-primary">{l("Wyślij", "Send")}</span></div>
      </div>
      <div className="bx-hub bx-p2" style={at({ x: 286, y: 96 })}><Ico name="bolt" /></div>
      <span className="bx-hub-label bx-muted bx-small" style={at({ x: 270, y: 172, w: 100 })}>webhook</span>
      {outs.map(o => (
        <div key={o.label} className={`bx-card bx-out bx-p2 bx-t${o.t}`} style={at({ x: 432, y: o.y, w: 192 })}>
          <span className="bx-icon-dot"><Ico name={o.icon} /></span><span>{o.label}</span><span className="bx-ok"><Ico name="check" /></span>
        </div>
      ))}
    </>
  );
}

function CameraArt({ l }: { l: L }) {
  return (
    <>
      <div className="bx-frame bx-p1" style={at({ x: 16, y: 16, w: 384, h: 228 })}>
        <svg viewBox="0 0 384 228" width="384" height="228" aria-hidden="true">
          <path className="bx-scene-line" d="M0 176 L384 150 M0 206 L384 182 M60 228 L132 150 M300 228 L268 150" />
          <rect className="bx-scene-line" x="236" y="58" width="118" height="96" rx="2" />
          <path className="bx-scene-line" d="M252 154 V96 H290 V154 M236 82 H354" />
          <path className="bx-zone" d="M160 132 L300 120 L338 196 L144 214 Z" />
          <g className="bx-car"><rect x="26" y="134" width="70" height="30" rx="8" className="bx-scene-fill" /><rect x="40" y="122" width="40" height="18" rx="6" className="bx-scene-fill" /></g>
          <rect className="bx-box is-muted" x="20" y="116" width="82" height="54" rx="3" />
        </svg>
        <span className="bx-frame-tag" style={at({ x: 10, y: 10 })}><Ico name="cam" />{l("Kamera 2", "Camera 2")}<i className="bx-live" /></span>
        <span className="bx-zone-label" style={at({ x: 170, y: 196 })}>{l("strefa: wejście", "zone: entrance")}</span>
        <span className="bx-box-label is-muted" style={at({ x: 20, y: 100 })}>{l("pojazd, poza strefą", "vehicle, outside zone")}</span>
        <div className="bx-walker">
          <svg viewBox="0 0 40 80" width="40" height="80" aria-hidden="true"><circle cx="20" cy="12" r="8" className="bx-scene-fill" /><path d="M8 34 Q20 20 32 34 L30 60 L24 60 L22 78 L18 78 L16 60 L10 60 Z" className="bx-scene-fill" /></svg>
          <span className="bx-box is-hit" />
          <span className="bx-box-label is-hit">{l("osoba", "person")}</span>
        </div>
      </div>
      <div className="bx-card bx-p2 bx-t45" style={at({ x: 416, y: 30, w: 210 })}>
        <div className="bx-row"><span className="bx-icon-dot is-copper"><Ico name="bolt" /></span><span className="bx-stack"><b>{l("Alarm w panelu", "Alarm in the panel")}</b><small>{l("Kamera 2, strefa: wejście", "Camera 2, zone: entrance")}</small></span></div>
      </div>
      <div className="bx-card bx-p2 bx-t60" style={at({ x: 416, y: 108, w: 210 })}>
        <div className="bx-row bx-muted bx-small"><Ico name="spark" />{l("Opis z lokalnego modelu AI", "Description by a local AI model")}</div>
        <p className="bx-small bx-ink bx-type">{l("Jedna osoba podchodzi do bramy od strony parkingu.", "One person walks up to the gate from the car park.")}</p>
      </div>
    </>
  );
}

function ReviewArt({ l }: { l: L }) {
  const card = (cls: string, time: string, note: string, extra?: ReactNode) => (
    <div className={`bx-card bx-alarm ${cls}`}>
      <div className="bx-thumb"><span className="bx-thumb-box" /></div>
      <div className="bx-stack bx-grow">
        <b>{l(`Alarm ${time}, kamera 4`, `Alarm ${time}, camera 4`)}</b>
        <span className="bx-chip"><Ico name="spark" />{note}</span>
        {extra}
      </div>
    </div>
  );
  return (
    <>
      <span className="bx-chip is-copper bx-p1" style={at({ x: 128, y: 12 })}>{l("Decyzja zawsze u operatora", "A person always decides")}</span>
      <div className="bx-fan bx-p1" style={at({ x: 50, y: 48, w: 320, h: 150 })}>
        {card("is-back2", "13:47", l("Ocena modelu: ruch przy ogrodzeniu", "Model: movement by the fence"))}
        {card("is-back1", "13:58", l("Ocena modelu: osoba przy bramie", "Model: person at the gate"))}
        {card("is-top bx-swipe", "14:02", l("Ocena modelu: raczej cień drzewa", "Model: likely a tree shadow"),
          <span className="bx-row bx-gap"><span className="bx-btn">{l("Potwierdź", "Confirm")}</span><span className="bx-btn is-dark bx-press">{l("Odrzuć", "Dismiss")}</span></span>)}
      </div>
      <Cursor from={[60, 250]} to={[224, 152]} />
      <Toast p={{ x: 104, y: 206 }} t={55}>{l("Decyzja operatora zapisana", "Operator decision saved")}</Toast>
    </>
  );
}

function ReportArt({ l }: { l: L }) {
  const bars = [0.42, 0.58, 0.5, 0.74, 0.66, 0.9, 0.35];
  const days = l("pn wt śr cz pt sb nd", "Mo Tu We Th Fr Sa Su").split(" ");
  return (
    <>
      <div className="bx-card bx-p1" style={at({ x: 28, y: 14, w: 364 })}>
        <div className="bx-row bx-spread"><span className="bx-row"><Ico name="mail" /><b>{l("Raport tygodniowy", "Weekly report")}</b></span><small className="bx-muted">{l("pon., 7:00", "Mon, 7:00")}</small></div>
        <small className="bx-muted">{l("Do: właściciel firmy", "To: business owner")}</small>
        <div className="bx-bars">
          {bars.map((h, i) => (
            <span key={i} className="bx-bar"><i className={`bx-grow${i === 5 ? " is-copper" : ""}`} style={{ "--h": h, "--i": i } as CSSProperties} /><small>{days[i]}</small></span>
          ))}
        </div>
        <div className="bx-row bx-gap bx-t45"><span className="bx-skel" style={{ width: 140 }} /><span className="bx-skel" style={{ width: 90 }} /></div>
      </div>
      <Toast p={{ x: 210, y: 208 }} t={60}>{l("Wysłany e-mailem", "Sent by email")}</Toast>
    </>
  );
}

function SourcesDataArt({ l }: { l: L }) {
  const srcs = [
    { icon: "cart" as const, label: l("Sklep internetowy", "Online store"), y: 28, t: 5 },
    { icon: "table" as const, label: l("Arkusz kosztów", "Cost sheet"), y: 80, t: 15 },
    { icon: "doc" as const, label: l("Program księgowy", "Accounting app"), y: 132, t: 25 },
    { icon: "people" as const, label: "CRM", y: 184, t: 35 },
  ];
  const wires = srcs.map(s => `M176 ${s.y + 18} C214 ${s.y + 18} 214 130 250 130`);
  return (
    <>
      <Wires t={15} paths={wires} />
      {wires.map((d, i) => <Dot key={d} d={d} t={[15, 25, 35, 45][i]} />)}
      {srcs.map(s => (
        <div key={s.label} className={`bx-pill bx-src bx-p1 bx-t${s.t}`} style={at({ x: 16, y: s.y, w: 160 })}>
          <Ico name={s.icon} />{s.label}
        </div>
      ))}
      <div className="bx-card bx-dash bx-p2" style={at({ x: 250, y: 18, w: 374, h: 224 })}>
        <div className="bx-row bx-spread"><b>{l("Sprzedaż i koszty", "Sales and costs")}</b><span className="bx-legend"><i className="is-copper" />{l("sprzedaż", "sales")}<i />{l("koszty", "costs")}</span></div>
        <svg className="bx-chart" viewBox="0 0 340 150" width="340" height="150" aria-hidden="true">
          <path className="bx-grid-line" d="M0 30 H340 M0 75 H340 M0 120 H340" />
          <path className="bx-area bx-t55" d="M0 118 C40 110 60 92 100 96 S170 70 210 60 S290 40 340 26 V150 H0 Z" />
          <path className="bx-line-a bx-d40" pathLength={1} d="M0 118 C40 110 60 92 100 96 S170 70 210 60 S290 40 340 26" />
          <path className="bx-line-b bx-d45" pathLength={1} d="M0 128 C50 124 80 112 120 116 S200 104 240 100 S300 92 340 88" />
        </svg>
        <div className="bx-probe">
          <span className="bx-probe-line" />
          <span className="bx-probe-dot" />
          <span className="bx-card bx-probe-tip">{l("Tydzień 3", "Week 3")}</span>
        </div>
      </div>
    </>
  );
}

export const ART_WIDTH: Record<BentoArt, number> = {
  call: 640, sources: 420, inbox: 420, summary: 640, invoice: 640, match: 420,
  approval: 420, webhook: 640, camera: 640, review: 420, report: 420, "sources-data": 640,
};

export function BentoArtScene({ art, pl }: { art: BentoArt; pl: boolean }) {
  const l: L = (a, b) => (pl ? a : b);
  switch (art) {
    case "call": return <CallArt l={l} />;
    case "sources": return <SourcesArt l={l} />;
    case "inbox": return <InboxArt l={l} />;
    case "summary": return <SummaryArt l={l} />;
    case "invoice": return <InvoiceArt l={l} />;
    case "match": return <MatchArt l={l} />;
    case "approval": return <ApprovalArt l={l} />;
    case "webhook": return <WebhookArt l={l} />;
    case "camera": return <CameraArt l={l} />;
    case "review": return <ReviewArt l={l} />;
    case "report": return <ReportArt l={l} />;
    case "sources-data": return <SourcesDataArt l={l} />;
  }
}
