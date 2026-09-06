import {describe,expect,it} from "vitest";
import {datesForTrip,dayIdForDate,migrationForLegacyState,normalizeTripProfile,tripPlanDayIds} from "../rome/trip-profile.js";

describe("Rome trip profile",()=>{
  it("is safe without configuration",()=>{
    const profile=normalizeTripProfile({});
    expect(profile.configured).toBe(false);
    expect(tripPlanDayIds(profile)).toEqual(["day-1","day-2","day-3"]);
  });
  it("maps trip dates to days",()=>{
    const profile=normalizeTripProfile({configured:true,arrivalDate:"2026-10-07",departureDate:"2026-10-10",fullDays:4});
    expect(datesForTrip(profile)["day-4a"]).toBe("2026-10-10");
    expect(dayIdForDate(profile,"2026-10-09")).toBe("day-3");
  });
  it("keeps optional dome routing and reduced-admission preferences",()=>{
    const profile=normalizeTripProfile({domeRoute:"sobieski",reducedAdmission:true});
    expect(profile.domeRoute).toBe("sobieski");
    expect(profile.reducedAdmission).toBe(true);
  });
  it("clears only the obsolete default ticket slots",()=>{
    const legacy=migrationForLegacyState({anchorSlots:{colosseum:"08:30","vatican-museums":"08:30","borghese-gallery":"10:00","catacombs-san-sebastiano":"10:30"}});
    const custom=migrationForLegacyState({anchorSlots:{colosseum:"09:20","vatican-museums":"08:30","borghese-gallery":"10:00","catacombs-san-sebastiano":"10:30"}});
    expect(legacy.anchorSlots).toEqual({colosseum:"","vatican-museums":"","borghese-gallery":"","catacombs-san-sebastiano":""});
    expect(custom).toEqual({profileVersion:1});
  });
});
