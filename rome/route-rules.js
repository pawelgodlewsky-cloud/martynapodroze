export const POINT_TYPES = Object.freeze({
  HARD_ANCHOR: "HARD_ANCHOR",
  CONSTRAINED: "CONSTRAINED",
  FLEX: "FLEX"
});

const minutes = value => {
  const [hour = 0, minute = 0] = String(value || "").split(":").map(Number);
  return hour * 60 + minute;
};

export const ROME_TIME_ZONE = "Europe/Rome";
export const CASTEL_SPECIAL_MONDAYS_2026 = Object.freeze(["2026-08-03","2026-09-07","2026-10-05","2026-11-02","2026-12-07"]);
export const TREVI_LATE_OPENING_DATES_2026 = Object.freeze(["2026-09-14","2026-09-28","2026-10-12","2026-10-26","2026-11-09","2026-11-23","2026-12-07","2026-12-21"]);
export const VATICAN_CLOSED_DATES_2026 = Object.freeze(["2026-01-01","2026-01-06","2026-02-11","2026-03-19","2026-04-06","2026-05-01","2026-06-29","2026-08-14","2026-08-15","2026-11-01","2026-12-08","2026-12-25","2026-12-26"]);

const dateAtNoonUtc = dateValue => new Date(`${dateValue}T12:00:00Z`);
export function weekdayInRome(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || ""))) return -1;
  const short = new Intl.DateTimeFormat("en-US",{timeZone:ROME_TIME_ZONE,weekday:"short"}).format(dateAtNoonUtc(dateValue));
  return ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].indexOf(short);
}
export function romeDateTimeParts(value = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:ROME_TIME_ZONE,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(value).map(part => [part.type,part.value]));
  return {date:`${parts.year}-${parts.month}-${parts.day}`,time:`${parts.hour}:${parts.minute}`,minutes:Number(parts.hour) * 60 + Number(parts.minute)};
}
export function isFirstSunday(dateValue) { return weekdayInRome(dateValue) === 0 && Number(String(dateValue).slice(8,10)) <= 7; }
export function isLastSunday(dateValue) {
  if (weekdayInRome(dateValue) !== 0) return false;
  const date = dateAtNoonUtc(dateValue); date.setUTCDate(date.getUTCDate() + 7);
  return date.getUTCMonth() !== Number(dateValue.slice(5,7)) - 1;
}

const FREE_DAY_POLICIES = Object.freeze({
  colosseum:{admissionPrice:0,reservationRequired:false,reservationFee:0,ticketMethod:"on_site",note:"Dziś obowiązuje darmowy wstęp. Nie wybierasz standardowego slotu online. Przyjedź możliwie wcześnie i odbierz bilet na miejscu."},
  pantheon:{admissionPrice:0,reservationRequired:false,reservationFee:0,ticketMethod:"on_site",note:"Dziś wstęp jest bezpłatny."},
  "castel-santangelo":{admissionPrice:0,reservationRequired:false,reservationFee:0,ticketMethod:"on_site",note:"Dziś wstęp może być bezpłatny. Sprawdź zasady wydawania biletu na miejscu."},
  "borghese-gallery":{admissionPrice:0,reservationRequired:true,reservationFee:2,ticketMethod:"reservation",note:"Wstęp bezpłatny, rezerwacja 2 EUR. Rezerwacja godziny nadal jest obowiązkowa."}
});

export function admissionPolicy(placeId,dateValue,{reduced=false,slot=""}={}) {
  const standard = {
    colosseum:{admissionPrice:reduced ? 2 : 18,reservationRequired:true,reservationFee:0,ticketMethod:"online_slot"},
    pantheon:{admissionPrice:reduced ? 2 : 7,reservationRequired:false,reservationFee:0,ticketMethod:"ticket"},
    "castel-santangelo":{admissionPrice:18,reservationRequired:false,reservationFee:0,ticketMethod:"ticket"},
    "borghese-gallery":{admissionPrice:slot === "17:45" ? 11 : 16,reservationRequired:true,reservationFee:2,ticketMethod:"reservation"},
    "vatican-museums":{admissionPrice:25,reservationRequired:true,reservationFee:0,ticketMethod:"online_slot"},
    "torre-argentina-area":{admissionPrice:7,reservationRequired:false,reservationFee:0,ticketMethod:"ticket"},
    "catacombs-san-sebastiano":{admissionPrice:10,reservationRequired:true,reservationFee:0,ticketMethod:"reservation"},
    "vittoriano-terrace":{admissionPrice:18,reservationRequired:false,reservationFee:0,ticketMethod:"ticket"}
  }[placeId] || {admissionPrice:0,reservationRequired:false,reservationFee:0,ticketMethod:"none"};
  if (placeId === "castel-santangelo" && CASTEL_SPECIAL_MONDAYS_2026.includes(dateValue)) return {...standard,admissionPrice:5,reservationRequired:false,reservationFee:0,ticketMethod:"on_site",note:"Specjalne otwarcie 14:00–20:00, ostatnie wejście 19:00. Bilet 5 EUR, sprzedaż na miejscu."};
  if (placeId === "castel-santangelo" && isMonday(dateValue)) return {...standard,admissionPrice:0,available:false,note:"Dziś zamknięte. Specjalne poniedziałkowe otwarcia w 2026 obowiązują tylko w pięciu jawnie wskazanych terminach."};
  if (placeId === "vatican-museums" && isLastSunday(dateValue)) return {...standard,admissionPrice:0,reservationRequired:false,reservationFee:0,ticketMethod:"on_site",note:"Ostatnia niedziela miesiąca: darmowy wstęp w specjalnym trybie 09:00–14:00, ostatnie wejście 12:30."};
  const nationalColosseumFree = placeId === "colosseum" && dateValue?.startsWith("2026-") && ["04-25","06-02","11-04"].includes(dateValue.slice(5));
  if ((isFirstSunday(dateValue) || nationalColosseumFree) && FREE_DAY_POLICIES[placeId]) return {...standard,...FREE_DAY_POLICIES[placeId]};
  return standard;
}

export function vaticanMuseumStatus(dateValue) {
  if (!dateValue) return {open:true,mode:"standard",hours:"08:00–20:00",lastEntry:"18:00"};
  if (VATICAN_CLOSED_DATES_2026.includes(dateValue)) return {open:false,mode:"closed",reason:"Muzea Watykańskie są tego dnia zamknięte."};
  if (weekdayInRome(dateValue) === 0) return isLastSunday(dateValue)
    ? {open:true,mode:"last_sunday",hours:"09:00–14:00",lastEntry:"12:30",note:"Ostatnia niedziela miesiąca: specjalny tryb i zasady darmowego wejścia."}
    : {open:false,mode:"closed",reason:"Muzea Watykańskie są tego dnia zamknięte."};
  return {open:true,mode:"standard",hours:"08:00–20:00",lastEntry:"18:00"};
}

export function largoArgentinaStatus(dateValue,timeValue="12:00") {
  if (!dateValue) return {open:true,lastEntry:"18:45",hours:"10:00–19:00"};
  if (weekdayInRome(dateValue) === 1 || ["12-25","05-01"].includes(dateValue.slice(5))) return {open:false,reason:"Teren archeologiczny jest tego dnia zamknięty."};
  if (["12-24","12-31"].includes(dateValue.slice(5))) return {open:minutes(timeValue) <= minutes("13:15"),hours:"09:30–14:00",lastEntry:"13:15"};
  const winter = dateValue.slice(5) >= "10-25" || dateValue.slice(5) <= "03-28";
  const lastEntry = winter ? "15:45" : "18:45";
  return {open:minutes(timeValue) <= minutes(lastEntry),hours:winter ? "10:00–16:00" : "10:00–19:00",lastEntry};
}

export function treviPaidZoneStatus(dateValue,timeValue="12:00") {
  const opening = TREVI_LATE_OPENING_DATES_2026.includes(dateValue) ? "14:00" : [1,5].includes(weekdayInRome(dateValue)) ? "11:30" : "09:00";
  return {open:minutes(timeValue) >= minutes(opening) && minutes(timeValue) <= minutes("21:00"),opening,closing:"22:00",lastEntry:"21:00"};
}

export function borgheseVisit(dateValue,slot="10:00") {
  if (weekdayInRome(dateValue) === 1) return {open:false,duration:0,end:"",...admissionPolicy("borghese-gallery",dateValue,{slot})};
  const duration = slot === "17:45" ? 75 : 120;
  const endMinutes = minutes(slot) + duration;
  return {open:true,duration,end:`${String(Math.floor(endMinutes / 60)).padStart(2,"0")}:${String(endMinutes % 60).padStart(2,"0")}`,...admissionPolicy("borghese-gallery",dateValue,{slot})};
}

export function vaticanVariant(slot = "08:00") {
  const value = minutes(slot);
  if (value <= minutes("09:30")) return "early";
  if (value <= minutes("11:30")) return "medium";
  return "late";
}

export function routeStartTime(dayId, slot, fallback = "08:30") {
  if (!slot) return fallback;
  if (dayId === "day-1" && minutes(slot) > minutes("10:30")) return fallback;
  if (dayId === "day-2" && vaticanVariant(slot) === "late") return "09:00";
  if (dayId === "day-4a" && minutes(slot) > minutes("12:00")) return fallback;
  const start = Math.max(0,minutes(slot) - 15);
  return `${String(Math.floor(start / 60)).padStart(2,"0")}:${String(start % 60).padStart(2,"0")}`;
}

export function isMonday(dateValue) {
  return weekdayInRome(dateValue) === 1;
}

export function isFirstMonday2026(dateValue) {
  return CASTEL_SPECIAL_MONDAYS_2026.includes(dateValue);
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
    const route = admissionPolicy("colosseum",dates[dayId],{slot:slots.colosseum}).ticketMethod !== "on_site" && minutes(slots.colosseum || "08:30") > minutes("10:30") ? late : normal;
    return options.vittorianoTerrace ? [...route,"vittoriano-terrace"] : route;
  }
  if (dayId === "day-2" && mode === "full") {
    if (!vaticanMuseumStatus(dates[dayId]).open) return ["st-peter","st-peter-square","ponte-santangelo","piazza-navona","pantheon"];
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
    if (options.torreArgentinaInterior && largoArgentinaStatus(dates[dayId],"12:00").open) base.splice(5,0,"torre-argentina-area");
    const easy = state.planner?.pace === "slow" || state.planner?.company === "family" || state.planner?.company === "mobility";
    return easy ? base : [...base,"gianicolo"];
  }
  if (dayId === "day-4a" && mode === "full") {
    const hasGalleryTicket = !state.tripProfile?.configured || Boolean(slots["borghese-gallery"]);
    if (isMonday(dates[dayId]) || !hasGalleryTicket) return ["villa-borghese","pincio","popolo"];
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

const uniqueInOrder = values => [...new Set(values)];

/**
 * Deterministic rescue rules used by the on-street assistant.
 * @param {{
 *   ids?: string[],
 *   places?: Array<{id:string,scheduleType?:string,duration?:number,environment?:string}>,
 *   situation?: string,
 *   level?: string,
 *   delayMinutes?: number,
 *   currentIndex?: number,
 *   nowMinutes?: number,
 *   closingMinutes?: Record<string,number>,
 *   rainIds?: string[],
 *   essentialIds?: string[]
 * }} options
 */
export function adaptRoute({
  ids = [],
  places = [],
  situation = "delay",
  level = "light",
  delayMinutes = 0,
  currentIndex = 0,
  nowMinutes = 0,
  closingMinutes = {},
  rainIds = [],
  essentialIds = []
} = {}) {
  const byId = new Map(places.map(item => [item.id,item]));
  const protectedIds = new Set(ids.slice(0,Math.max(0,currentIndex + 1)));
  ids.forEach(id => { if (byId.get(id)?.scheduleType === POINT_TYPES.HARD_ANCHOR) protectedIds.add(id); });
  const removed = [];
  const shortened = [];
  let nextIds = [...ids];
  const remove = id => {
    if (protectedIds.has(id) || !nextIds.includes(id)) return false;
    nextIds = nextIds.filter(value => value !== id);
    removed.push(id);
    return true;
  };
  const flexCandidates = () => [...nextIds].reverse().filter(id => byId.get(id)?.scheduleType === POINT_TYPES.FLEX && !protectedIds.has(id) && !essentialIds.includes(id));

  if (situation === "delay") {
    if (nowMinutes) {
      let cursor = nowMinutes + Number(delayMinutes || 0);
      for (const id of [...nextIds]) {
        const item = byId.get(id);
        if (!item || protectedIds.has(id)) continue;
        cursor += Number(item.duration || 0);
        if (item.scheduleType === POINT_TYPES.CONSTRAINED && closingMinutes[id] && cursor > closingMinutes[id]) remove(id);
      }
    }
    const flexToRemove = delayMinutes >= 60 ? 2 : delayMinutes >= 30 ? 1 : 0;
    flexCandidates().slice(0,flexToRemove).forEach(remove);
    if (delayMinutes >= 30) {
      const compact = nextIds.find(id => byId.get(id)?.scheduleType === POINT_TYPES.FLEX && !protectedIds.has(id));
      if (compact) shortened.push(compact);
    }
  }

  if (situation === "tired") {
    if (level === "strong") {
      const keep = new Set([...protectedIds,...essentialIds]);
      nextIds.filter(id => !keep.has(id)).forEach(remove);
    } else flexCandidates().slice(0,2).forEach(remove);
  }

  if (situation === "rain") {
    const preferred = rainIds.length ? rainIds : ids.filter(id => byId.get(id)?.environment !== "outdoor");
    const keep = new Set([...preferred,...protectedIds]);
    nextIds.filter(id => !keep.has(id)).forEach(remove);
    nextIds = uniqueInOrder([...ids.filter(id => keep.has(id)),...preferred.filter(id => !ids.includes(id))]);
  }

  return {
    ids:uniqueInOrder(nextIds),
    removed:uniqueInOrder(removed),
    shortened:uniqueInOrder(shortened),
    hardAnchors:ids.filter(id => byId.get(id)?.scheduleType === POINT_TYPES.HARD_ANCHOR),
    savedMinutes:removed.reduce((sum,id)=>sum + Number(byId.get(id)?.duration || 0),0) + shortened.length * 15
  };
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
