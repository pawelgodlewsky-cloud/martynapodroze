import { describe, expect, it } from "vitest";
import { activeAlerts, adaptRoute, isFirstMonday2026, isSanSebastianoAnnualClosure, resolveRoute, romaPassComparison, routeStartTime, vaticanVariant } from "../rome/route-rules.js";

describe("Rome route rules", () => {
  it("selects all three Vatican variants at their boundaries", () => {
    expect(vaticanVariant("09:30")).toBe("early");
    expect(vaticanVariant("10:00")).toBe("medium");
    expect(vaticanVariant("12:00")).toBe("late");
  });

  it("starts before morning stops when an anchor is late", () => {
    expect(routeStartTime("day-2","13:00","07:45")).toBe("09:00");
    expect(routeStartTime("day-1","13:00","08:15")).toBe("08:15");
    expect(routeStartTime("day-4a","15:00","08:45")).toBe("08:45");
    expect(routeStartTime("day-1","09:20","08:15")).toBe("09:05");
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

  it("uses the park fallback when a configured trip has no Borghese ticket", () => {
    const route=resolveRoute("day-4a",{mode:"full",tripProfile:{configured:true},anchorSlots:{"borghese-gallery":""},tripDates:{"day-4a":"2026-09-08"}});
    expect(route).toEqual(["villa-borghese","pincio","popolo"]);
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

  const rescuePlaces = [
    {id:"anchor",scheduleType:"HARD_ANCHOR",duration:75,environment:"indoor"},
    {id:"flex",scheduleType:"FLEX",duration:45,environment:"outdoor"},
    {id:"limited",scheduleType:"CONSTRAINED",duration:60,environment:"indoor"},
    {id:"extra",scheduleType:"FLEX",duration:30,environment:"outdoor"}
  ];

  it("never removes a HARD_ANCHOR for delay or tired mode", () => {
    const delayed=adaptRoute({ids:["anchor","flex","limited","extra"],places:rescuePlaces,situation:"delay",delayMinutes:60,currentIndex:0});
    const tired=adaptRoute({ids:["anchor","flex","limited","extra"],places:rescuePlaces,situation:"tired",level:"strong",essentialIds:[]});
    expect(delayed.ids).toContain("anchor");
    expect(tired.ids).toContain("anchor");
  });

  it("can remove FLEX and an unsafe CONSTRAINED point", () => {
    const result=adaptRoute({ids:["anchor","flex","limited","extra"],places:rescuePlaces,situation:"delay",delayMinutes:60,currentIndex:0,nowMinutes:17*60,closingMinutes:{limited:18*60}});
    expect(result.ids).not.toContain("extra");
    expect(result.ids).not.toContain("limited");
  });
});
