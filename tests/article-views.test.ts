import { describe, expect, it, vi } from "vitest";
import { incrementArticleView, isPublishedArticleSlug } from "../src/article-views";
import type { Env } from "../src/types";

describe("article views", () => {
  it("accepts only published blog article slugs", () => {
    expect(isPublishedArticleSlug("bergamo-w-jeden-dzien")).toBe(true);
    expect(isPublishedArticleSlug("lombardia-w-4-dni")).toBe(true);
    expect(isPublishedArticleSlug("nieistniejacy-artykul")).toBe(false);
  });

  it("increments and returns the persisted view count", async () => {
    const first = vi.fn().mockResolvedValue({ views: 42 });
    const bind = vi.fn().mockReturnValue({ first });
    const prepare = vi.fn().mockReturnValue({ bind });
    const env = { DB: { prepare } } as unknown as Env;

    await expect(incrementArticleView(env, "bergamo-w-jeden-dzien")).resolves.toBe(42);
    expect(bind).toHaveBeenCalledWith("bergamo-w-jeden-dzien");
  });
});
