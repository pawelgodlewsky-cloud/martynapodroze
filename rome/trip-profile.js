export const DEFAULT_TRIP_PROFILE = Object.freeze({
  configured:false,
  arrivalDate:"",
  departureDate:"",
  fullDays:3,
  airport:"none",
  accommodationName:"",
  accommodationAddress:"",
  pace:"normal",
  travelType:"couple"
});

const isoDate = value => /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value) : "";

export function normalizeTripProfile(profile = {}) {
  const pace = ["slow","normal","intense"].includes(profile.pace) ? profile.pace : "normal";
  const travelType = ["couple","children","other"].includes(profile.travelType) ? profile.travelType : "couple";
  const airport = ["FCO","CIA","none"].includes(profile.airport) ? profile.airport : "none";
  return {
    ...DEFAULT_TRIP_PROFILE,
    ...profile,
    configured:Boolean(profile.configured),
    arrivalDate:isoDate(profile.arrivalDate),
    departureDate:isoDate(profile.departureDate),
    fullDays:Math.max(1,Math.min(4,Number(profile.fullDays) || 3)),
    airport,
    pace,
    travelType,
    accommodationName:String(profile.accommodationName || "").trim(),
    accommodationAddress:String(profile.accommodationAddress || "").trim()
  };
}

export function tripPlanDayIds(profile = {}) {
  const count = normalizeTripProfile(profile).fullDays;
  return ["day-1","day-2","day-3","day-4a"].slice(0,count);
}

export function datesForTrip(profile = {}) {
  const normalized = normalizeTripProfile(profile);
  if (!normalized.arrivalDate) return {};
  const start = new Date(`${normalized.arrivalDate}T12:00:00`);
  return Object.fromEntries(tripPlanDayIds(normalized).map((dayId,index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return [dayId,date.toLocaleDateString("sv-SE")];
  }));
}

export function dayIdForDate(profile = {}, dateValue = "") {
  const dates = datesForTrip(profile);
  return Object.entries(dates).find(([,date]) => date === dateValue)?.[0] || null;
}

export function tripDateRange(profile = {}, locale = "pl-PL") {
  const normalized = normalizeTripProfile(profile);
  if (!normalized.arrivalDate) return "Daty nieustawione";
  const arrival = new Date(`${normalized.arrivalDate}T12:00:00`);
  const departureValue = normalized.departureDate || Object.values(datesForTrip(normalized)).at(-1);
  const departure = new Date(`${departureValue}T12:00:00`);
  const format = date => date.toLocaleDateString(locale,{day:"numeric",month:"long"});
  return `${format(arrival)}–${format(departure)}`;
}
