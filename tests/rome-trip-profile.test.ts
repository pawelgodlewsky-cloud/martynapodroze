import {describe,expect,it} from "vitest";
import {datesForTrip,dayIdForDate,normalizeTripProfile,tripPlanDayIds} from "../rome/trip-profile.js";

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
});
