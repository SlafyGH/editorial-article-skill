// Bento on /uslugi/dzial-ai: three tabs, four flagship services each. Titles and descriptions come straight
// from the confirmed capability list (capabilityCategories.ts), so the bento never says more than the guides do.
import { CAPABILITY_CATEGORIES, type CapabilityItem } from "@/lib/capabilityCategories";
import type { PublicLocale } from "@/lib/aiCapabilities";

type Copy = Record<PublicLocale, string>;

export type BentoArt =
  | "call" | "sources" | "inbox" | "summary"
  | "invoice" | "match" | "approval" | "webhook"
  | "camera" | "review" | "report" | "sources-data";

export type BentoCell = {
  art: BentoArt;
  category: string;
  item: CapabilityItem;
  wide: boolean;
  /** A published case study that shows this kind of work for real. */
  caseStudy?: string;
};

export type BentoTab = { id: string; label: Copy; cells: BentoCell[] };

const item = (slug: string, title: string): CapabilityItem => {
  const found = CAPABILITY_CATEGORIES.find(c => c.slug === slug)?.items.find(i => i.title.pl === title);
  if (!found) throw new Error(`serviceBento: no capability "${title}" in category "${slug}"`);
  return found;
};

const cell = (art: BentoArt, category: string, title: string, wide: boolean, caseStudy?: string): BentoCell =>
  ({ art, category, item: item(category, title), wide, caseStudy });

export const BENTO_TABS: BentoTab[] = [
  {
    id: "klienci",
    label: { pl: "Obsługa klienta", en: "Customer service" },
    cells: [
      cell("call", "recepcja", "AI recepcjonistka odbierająca połączenia", true, "/projects/agent-glosowy"),
      cell("sources", "wiedza", "Odpowiadanie ze wskazaniem źródeł", false, "/projects/baza-wiedzy"),
      cell("inbox", "poczta", "Podsumowanie skrzynki i przygotowanie szkiców odpowiedzi", false),
      cell("summary", "recepcja", "Podsumowywanie rozmów telefonicznych", true),
    ],
  },
  {
    id: "dokumenty",
    label: { pl: "Dokumenty i procesy", en: "Documents and workflows" },
    cells: [
      cell("invoice", "dokumenty", "Odczytywanie danych z faktur", true, "/projects/automatyzacje"),
      cell("match", "dokumenty", "Porównywanie faktur z zamówieniami", false),
      cell("approval", "automatyzacje", "Automatyzacja zatwierdzania wniosków", false),
      cell("webhook", "automatyzacje", "Integracja aplikacji przez API i webhooki", true),
    ],
  },
  {
    id: "dane",
    label: { pl: "Kamery i dane", en: "Cameras and data" },
    cells: [
      cell("camera", "obraz", "Analiza obrazu z kamer", true, "/projects/cctv"),
      cell("review", "obraz", "Systemy wspomagające przegląd obrazu przez człowieka", false),
      cell("report", "dane", "Regularne raporty dla właściciela firmy", false),
      cell("sources-data", "dane", "Łączenie danych z różnych źródeł", true),
    ],
  },
];
