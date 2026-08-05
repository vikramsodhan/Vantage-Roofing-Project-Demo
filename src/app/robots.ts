import type { MetadataRoute } from "next"

/**
 * Serves /robots.txt.
 *
 * Crawling is allowed *on purpose*. Keeping this demo out of search results is
 * the job of the `noindex` in the root layout's metadata — and a crawler can
 * only obey a `noindex` on a page it was allowed to fetch. A `Disallow: /` here
 * would block the fetch, leaving the tag unread, so a URL shared from a résumé
 * or LinkedIn could still surface as a bare link under the real company's name.
 *
 * Allow + noindex is therefore stricter than disallow, not weaker.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
  }
}
