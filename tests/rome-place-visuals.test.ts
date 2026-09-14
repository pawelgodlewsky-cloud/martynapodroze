import { describe, expect, it } from "vitest";

import { hasRealVisual, placeVisual } from "../rome/place-visuals.js";

describe("Rome plan visuals", () => {
  it("places only existing travel photos beside the route card", () => {
    for (const id of [
      "forum", "fori-imperiali", "forum-view", "campidoglio", "piazza-venezia", "vittoriano",
      "st-peter-square", "castel-santangelo", "ponte-santangelo", "piazza-navona", "pantheon", "trevi",
    ]) expect(hasRealVisual(id)).toBe(true);
    expect(placeVisual({ id: "forum", name: "Forum Romanum" })).toContain("assets/places/forum.jpg");
    expect(placeVisual({ id: "pantheon", name: "Pantheon" })).toContain("assets/places/pantheon.jpg");
  });

  it("does not reserve the photo column for a symbolic fallback", () => {
    expect(hasRealVisual("arch-constantine")).toBe(false);
    expect(hasRealVisual("via-del-corso")).toBe(false);
    expect(hasRealVisual("gianicolo")).toBe(false);
  });
});
