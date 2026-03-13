import { useEffect } from "react";

interface PageSEOOptions {
  title: string;
  description: string;
  canonicalPath: string;
}

function upsertMeta(selector: string, attr: string, value: string) {
  let el = document.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    const [attrName, attrVal] = selector.replace("[", "").replace("]", "").split('="');
    el.setAttribute(attrName, attrVal.replace('"', ""));
    document.head.appendChild(el);
  }
  el.setAttribute(attr, value);
  return el;
}

function upsertLink(rel: string, href: string) {
  let el = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement("link");
    el.rel = rel;
    document.head.appendChild(el);
  }
  el.href = href;
  return el;
}

export function usePageSEO({ title, description, canonicalPath }: PageSEOOptions) {
  useEffect(() => {
    const BASE_TITLE = "FeedbackForge";
    const BASE_DESC = "FeedbackForge is a SaaS feedback collection tool with customizable forms, AI-powered insights, public roadmaps, changelogs, and embeddable widgets. Start collecting feedback today.";
    const BASE_OG_TITLE = "FeedbackForge - Collect & Manage Customer Feedback";
    const BASE_OG_DESC = "Customizable feedback forms, AI-powered insights, public roadmaps, changelogs, and embeddable widgets. The all-in-one feedback tool for product teams.";
    const origin = window.location.origin;

    const fullTitle = `${title} | ${BASE_TITLE}`;
    const canonicalUrl = `${origin}${canonicalPath}`;

    const prevTitle = document.title;
    document.title = fullTitle;

    const descEl = upsertMeta('meta[name="description"]', "content", description);
    const prevDesc = descEl.getAttribute("content") ?? BASE_DESC;

    const ogTitleEl = upsertMeta('meta[property="og:title"]', "content", fullTitle);
    const prevOgTitle = ogTitleEl.getAttribute("content") ?? BASE_OG_TITLE;

    const ogDescEl = upsertMeta('meta[property="og:description"]', "content", description);
    const prevOgDesc = ogDescEl.getAttribute("content") ?? BASE_OG_DESC;

    let ogUrlEl = document.querySelector('meta[property="og:url"]') as HTMLMetaElement | null;
    const prevOgUrl = ogUrlEl?.getAttribute("content") ?? "";
    ogUrlEl = upsertMeta('meta[property="og:url"]', "content", canonicalUrl);

    const twTitleEl = upsertMeta('meta[name="twitter:title"]', "content", fullTitle);
    const prevTwTitle = twTitleEl.getAttribute("content") ?? BASE_OG_TITLE;

    const twDescEl = upsertMeta('meta[name="twitter:description"]', "content", description);
    const prevTwDesc = twDescEl.getAttribute("content") ?? BASE_OG_DESC;

    const canonEl = upsertLink("canonical", canonicalUrl);
    const prevCanonHref = canonEl.href;

    return () => {
      document.title = prevTitle;
      descEl.setAttribute("content", prevDesc);
      ogTitleEl.setAttribute("content", prevOgTitle);
      ogDescEl.setAttribute("content", prevOgDesc);
      if (prevOgUrl) ogUrlEl!.setAttribute("content", prevOgUrl);
      twTitleEl.setAttribute("content", prevTwTitle);
      twDescEl.setAttribute("content", prevTwDesc);
      canonEl.href = prevCanonHref;
    };
  }, [title, description, canonicalPath]);
}
