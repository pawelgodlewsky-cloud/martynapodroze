import { describe, expect, it } from "vitest";

import { hasRealVisual, placeVisual } from "../rome/place-visuals.js";

describe("Rome plan visuals", () => {
  it("places only existing travel photos beside the route card", () => {
    expect(hasRealVisual("forum")).toBe(true);
    expect(hasRealVisual("campidoglio")).toBe(true);
    expect(hasRealVisual("st-peter-square")).toBe(true);
    expect(placeVisual({ id: "forum", name: "Forum Romanum" })).toContain("assets/places/forum.jpg");
  });

  it("does not reserve the photo column for a symbolic fallback", () => {
    expect(hasRealVisual("fori-imperiali")).toBe(false);
    expect(hasRealVisual("forum-view")).toBe(false);
    expect(hasRealVisual("castel-santangelo")).toBe(false);
  });
});
