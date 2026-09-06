import { describe, expect, it } from "vitest";
import { activeAlerts, adaptRoute, admissionPolicy, borgheseVisit, isFirstMonday2026, isSanSebastianoAnnualClosure, largoArgentinaStatus, resolveRoute, romaPassComparison, romeDateTimeParts, routeStartTime, treviPaidZoneStatus, vaticanMuseumStatus, vaticanVariant } from "../rome/route-rules.js";

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
    expect(isFirstMonday2026("2026-07-06")).toBe(false);
    expect(isSanSebastianoAnnualClosure("2026-12-27")).toBe(true);
  });

  it("opens Castel only on the explicit special Monday dates",()=>{
    expect(admissionPolicy("castel-santangelo","2026-09-07").admissionPrice).toBe(5);
    expect(isFirstMonday2026("2026-09-07")).toBe(true);
    expect(isFirstMonday2026("2026-07-06")).toBe(false);
    expect(admissionPolicy("castel-santangelo","2026-07-06")).toMatchObject({admissionPrice:0,available:false});
    expect(resolveRoute("day-2",{mode:"full",tripDates:{"day-2":"2026-07-06"},anchorSlots:{"vatican-museums":"08:30"},routeOptions:{castelInterior:true}})).not.toContain("castel-santangelo");
  });

  it("applies attraction-specific first-Sunday prices and booking rules",()=>{
    const date="2026-09-06";
    expect(admissionPolicy("colosseum",date)).toMatchObject({admissionPrice:0,reservationRequired:false,ticketMethod:"on_site"});
    expect(admissionPolicy("pantheon",date).admissionPrice).toBe(0);
    expect(admissionPolicy("castel-santangelo",date).admissionPrice).toBe(0);
    expect(admissionPolicy("borghese-gallery",date)).toMatchObject({admissionPrice:0,reservationFee:2,reservationRequired:true});
    expect(resolveRoute("day-1",{mode:"full",tripDates:{"day-1":date},anchorSlots:{colosseum:"13:00"},routeOptions:{}})?.[0]).toBe("colosseum");
  });

  it("supports verified reduced admission without changing reservation rules",()=>{
    expect(admissionPolicy("colosseum","2026-09-08",{reduced:true})).toMatchObject({admissionPrice:2,reservationRequired:true});
    expect(admissionPolicy("pantheon","2026-09-08",{reduced:true}).admissionPrice).toBe(2);
  });

  it("recognizes Vatican closures and the last-Sunday special mode",()=>{
    expect(vaticanMuseumStatus("2026-12-08").open).toBe(false);
    expect(vaticanMuseumStatus("2026-09-13").open).toBe(false);
    expect(vaticanMuseumStatus("2026-09-27")).toMatchObject({open:true,mode:"last_sunday",lastEntry:"12:30"});
    expect(admissionPolicy("vatican-museums","2026-09-27")).toMatchObject({admissionPrice:0,ticketMethod:"on_site"});
    expect(resolveRoute("day-2",{mode:"full",tripDates:{"day-2":"2026-12-08"},anchorSlots:{"vatican-museums":"08:30"},routeOptions:{}})).not.toContain("vatican-museums");
  });

  it("rejects Largo Argentina interior after the winter last entry",()=>{
    expect(largoArgentinaStatus("2026-12-10","15:46").open).toBe(false);
    expect(largoArgentinaStatus("2026-06-10","18:45").open).toBe(true);
  });

  it("uses the shorter and cheaper final Borghese slot",()=>{
    expect(borgheseVisit("2026-09-08","17:45")).toMatchObject({open:true,duration:75,end:"19:00",admissionPrice:11,reservationFee:2});
  });

  it("applies 2026 Trevi late-opening overrides without affecting the public view",()=>{
    expect(treviPaidZoneStatus("2026-09-14","12:00")).toMatchObject({open:false,opening:"14:00"});
    expect(treviPaidZoneStatus("2026-09-14","14:15").open).toBe(true);
  });

  it("keeps the Rome date and local slot stable across the 2026 clock change",()=>{
    expect(romeDateTimeParts(new Date("2026-10-25T08:00:00Z"))).toEqual({date:"2026-10-25",time:"09:00",minutes:540});
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
