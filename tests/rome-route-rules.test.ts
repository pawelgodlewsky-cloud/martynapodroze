import { describe, expect, it } from "vitest";
import { activeAlerts, isFirstMonday2026, isSanSebastianoAnnualClosure, resolveRoute, romaPassComparison, vaticanVariant } from "../rome/route-rules.js";

describe("Rome route rules", () => {
  it("selects all three Vatican variants at their boundaries", () => {
    expect(vaticanVariant("09:30")).toBe("early");
    expect(vaticanVariant("10:00")).toBe("medium");
    expect(vaticanVariant("12:00")).toBe("late");
  });

  it("puts Pantheon before a late Vatican slot and omits Castel interior", () => {
    const route = resolveRoute("day-2", { mode:"full", anchorSlots:{"vatican-museums":"12:00"}, routeOptions:{} });
    expect(route?.slice(0,2)).toEqual(["pantheon","piazza-navona"]);
    expect(route).not.toContain("castel-santangelo");
  });

  it("moves Forum and Palatine before a late Colosseum slot", () => {
    const route = resolveRoute("day-1", { mode:"full", anchorSlots:{colosseum:"13:00"}, routeOptions:{} });
    expect(route?.slice(0,2)).toEqual(["palatine","forum"]);
    expect(route?.indexOf("forum")).toBeLessThan(route?.indexOf("colosseum") || 0);
  });

  it("uses outdoor fallbacks on Monday and during the catacomb closure", () => {
    expect(resolveRoute("day-4a", {mode:"full",tripDates:{"day-4a":"2026-09-07"}})).not.toContain("borghese-gallery");
    expect(resolveRoute("day-4b", {mode:"full",tripDates:{"day-4b":"2026-12-14"},routeOptions:{}})).not.toContain("catacombs-san-sebastiano");
    expect(isFirstMonday2026("2026-09-07")).toBe(true);
    expect(isSanSebastianoAnnualClosure("2026-12-27")).toBe(true);
  });

  it("expires temporary alerts automatically", () => {
    const alerts = [{startDate:"2026-09-07T00:00:00",endDate:"2026-09-11T23:59:59"}];
    expect(activeAlerts(alerts,"2026-09-10")).toHaveLength(1);
    expect(activeAlerts(alerts,"2026-09-12")).toHaveLength(0);
  });

  it("compares separate tickets with Roma Pass without counting Vatican", () => {
    const result = romaPassComparison({duration:"2",attractionCosts:[{price:18,eligible:true},{price:25,eligible:false,vatican:true}]});
    expect(result.separate).toBe(33);
    expect(result.worthwhile).toBe(false);
  });
});
