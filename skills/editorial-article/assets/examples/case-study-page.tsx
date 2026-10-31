import { PublicPage } from "@/components/PublicPage";
import type { Metadata } from "next";
import Link from "next/link";
import { Localized } from "@/components/Language";
import { CaseStudyArticle } from "@/components/CaseStudyArticle";
import en from "@/content/case-studies/automatyzacje/en.json";
import pl from "@/content/case-studies/automatyzacje/pl.json";
import "@/components/Blog.css";

const title = pl.title;
const description = pl.description;

export const metadata: Metadata = {
  title, description,
  alternates: { canonical: "/projects/automatyzacje" },
  openGraph: { type: "article", title, description, url: "/projects/automatyzacje" },
};

export default function AutomationsCaseStudy() {
  return (
    <PublicPage path="/projects/automatyzacje">
      <main className="site-main" id="main">
        <nav className="blog-breadcrumb" aria-label="Projects"><Link href="/projects">← <Localized pl="Wszystkie realizacje" en="All projects" /></Link></nav>
        <CaseStudyArticle pl={pl} en={en} assets="/realizacje/automatyzacje/assets" />
        <div className="site-container blog-close">
          <Link className="blog-read" href="/projects"><Localized pl="Wróć do realizacji" en="Back to projects" /></Link>
          <Link className="blog-read" href="/kontakt?temat=dzial-ai"><Localized pl="Porozmawiajmy o Twoim projekcie" en="Talk about your project" /></Link>
        </div>
      </main>
    </PublicPage>
  );
}
