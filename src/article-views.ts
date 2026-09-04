import type { Env } from "./types";

const ARTICLE_SLUGS = new Set([
  "bergamo-w-jeden-dzien",
  "lombardia-w-4-dni"
]);

export function isPublishedArticleSlug(slug: string): boolean {
  return ARTICLE_SLUGS.has(slug);
}

export async function incrementArticleView(env: Env, slug: string): Promise<number> {
  const row = await env.DB.prepare(`
    INSERT INTO blog_article_views (slug, views)
    VALUES (?, 1)
    ON CONFLICT(slug) DO UPDATE SET
      views = views + 1,
      updated_at = CURRENT_TIMESTAMP
    RETURNING views
  `).bind(slug).first<{ views: number }>();

  if (!row) throw new Error("Nie udało się zapisać odsłony artykułu.");
  return Number(row.views);
}
