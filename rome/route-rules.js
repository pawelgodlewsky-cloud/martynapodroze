export const POINT_TYPES = Object.freeze({
  HARD_ANCHOR: "HARD_ANCHOR",
  CONSTRAINED: "CONSTRAINED",
  FLEX: "FLEX"
});

const minutes = value => {
  const [hour = 0, minute = 0] = String(value || "").split(":").map(Number);
  return hour * 60 + minute;
};

export function vaticanVariant(slot = "08:00") {
  const value = minutes(slot);
  if (value <= minutes("09:30")) return "early";
  if (value <= minutes("11:30")) return "medium";
  return "late";
}

export function isMonday(dateValue) {
  if (!dateValue) return false;
  return new Date(`${dateValue}T12:00:00`).getDay() === 1;
}

export function isFirstMonday2026(dateValue) {
  if (!dateValue || !dateValue.startsWith("2026-")) return false;
  const date = new Date(`${dateValue}T12:00:00`);
  return date.getDay() === 1 && date.getDate() <= 7;
}

export function isWinterColosseumSeason(dateValue) {
  if (!dateValue) return false;
  const monthDay = dateValue.slice(5);
  return monthDay >= "10-25" || monthDay <= "02-28";
}

export function isSanSebastianoAnnualClosure(dateValue) {
  return Boolean(dateValue?.startsWith("2026-") && dateValue.slice(5) >= "12-07" && dateValue.slice(5) <= "12-27");
}

export function activeAlerts(alerts = [], dateValue = "") {
  if (!dateValue) return [];
  if (String(dateValue).length === 10) return alerts.filter(alert => dateValue >= alert.startDate.slice(0,10) && (!alert.endDate || dateValue <= alert.endDate.slice(0,10)));
  const point = dateValue;
  return alerts.filter(alert => point >= alert.startDate && (!alert.endDate || point <= alert.endDate));
}

export function resolveRoute(dayId, state = {}) {
  const options = state.routeOptions || {};
  const slots = state.anchorSlots || {};
  const dates = state.tripDates || {};
  const mode = state.mode || "full";
  if (dayId === "day-1" && mode === "full") {
    const normal = ["colosseum","arch-constantine","palatine","forum","fori-imperiali","forum-view","campidoglio","piazza-venezia","vittoriano"];
    const late = ["palatine","forum","fori-imperiali","forum-view","colosseum","arch-constantine","campidoglio","piazza-venezia","vittoriano"];
    const route = minutes(slots.colosseum || "08:30") > minutes("10:30") ? late : normal;
    return options.vittorianoTerrace ? [...route,"vittoriano-terrace"] : route;
  }
  if (dayId === "day-2" && mode === "full") {
    const variant = vaticanVariant(slots["vatican-museums"] || "08:30");
    const dome = Boolean(options.vaticanDome);
    if (variant === "late") return ["pantheon","piazza-navona","vatican-museums","st-peter","st-peter-square","ponte-santangelo"];
    const castelDate = dates[dayId];
    const castelOpen = !isMonday(castelDate) || isFirstMonday2026(castelDate);
    const safeCastel = castelOpen && options.castelInterior !== false && !dome && (variant === "early" || minutes(slots["vatican-museums"]) <= minutes("10:30"));
    return ["vatican-museums","st-peter","st-peter-square",...(safeCastel ? ["castel-santangelo"] : []),"ponte-santangelo","piazza-navona","pantheon"];
  }
  if (dayId === "day-3" && mode === "full") {
    const base = ["spanish-steps","trevi","via-del-corso","campo-fiori","torre-argentina","jewish-ghetto","tiber-island","trastevere","santa-maria-trastevere"];
    if (options.torreArgentinaInterior && !isMonday(dates[dayId])) base.splice(5,0,"torre-argentina-area");
    const easy = state.planner?.pace === "slow" || state.planner?.company === "family" || state.planner?.company === "mobility";
    return easy ? base : [...base,"gianicolo"];
  }
  if (dayId === "day-4a" && mode === "full") {
    if (isMonday(dates[dayId])) return ["villa-borghese","pincio","popolo"];
    return minutes(slots["borghese-gallery"] || "10:00") <= minutes("12:00")
      ? ["borghese-gallery","villa-borghese","pincio","popolo"]
      : ["villa-borghese","pincio","borghese-gallery","popolo"];
  }
  if (dayId === "day-4b" && mode === "full") {
    const date = dates[dayId];
    const outdoorOnly = isMonday(date) || isSanSebastianoAnnualClosure(date);
    const route = ["porta-san-sebastiano","appia-antica"];
    if (!outdoorOnly) route.push("catacombs-san-sebastiano");
    if (options.appiaParkPass && !outdoorOnly) route.push("cecilia-metella");
    return route;
  }
  return null;
}

/** @param {{duration?: string, attractionCosts?: Array<{price:number, eligible:boolean, vatican?:boolean}>}} options */
export function romaPassComparison(options = {}) {
  const {duration = "3", attractionCosts = []} = options;
  const hours = duration === "2" ? 48 : 72;
  const passPrice = hours === 48 ? 38 : 62.9;
  const transport = hours === 48 ? 15 : 22;
  const eligible = attractionCosts.filter(item => item.eligible && !item.vatican).map(item => Number(item.price) || 0).sort((a,b) => b-a);
  const covered = eligible.slice(0,hours === 48 ? 1 : 2).reduce((sum,value) => sum + value,0);
  const separate = transport + eligible.reduce((sum,value) => sum + value,0);
  const withPass = passPrice + Math.max(0,eligible.reduce((sum,value) => sum + value,0) - covered);
  return { hours, passPrice, separate, withPass, worthwhile:withPass < separate };
}
