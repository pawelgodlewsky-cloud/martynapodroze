const DATA_FILES = ["destinations", "points", "routes", "restaurants", "budget", "tips", "transport", "glossary", "food", "sources", "emergency", "attractions"];
const storageKey = "lombardia-ebook-v1";

const PLACE_DETAIL_ALIASES = Object.freeze({
  "d4-station": "bg-station",
  "d4-porta-nuova": "bg-porta-nuova",
  "d4-bus": "bg-station",
  "d4-airport": "bg-station",
  "co-return": "co-ferry-varenna"
});

const POINT_IMAGE_OVERRIDES = Object.freeze({
  "bg-porta-nuova": "assets/places/porta-nuova-generated.webp",
  "bg-funicular": "assets/places/funicolare-citta-alta-generated.webp",
  "bg-mercato": "assets/places/piazza-mercato-scarpe-generated.webp",
  "bg-piazza-vecchia": "assets/places/piazza-vecchia-generated.webp",
  "bg-basilica": "assets/places/santa-maria-colleoni-generated.webp",
  "bg-campanone": "assets/places/campanone-generated.webp",
  "bg-colle-aperto": "assets/places/colle-aperto-food-generated.webp",
  "bg-san-vigilio": "assets/places/castello-san-vigilio-generated.webp",
  "bg-porta-san-giacomo": "assets/places/porta-san-giacomo-generated.webp",
  "co-bergamo": "assets/places/bergamo-rail-replacement-generated.webp",
  "co-ponte-san-pietro": "assets/places/ponte-san-pietro-transfer-generated.webp",
  "co-lecco": "assets/places/lecco-station-transfer-generated.webp",
  "co-varenna-station": "assets/places/varenna-esino-generated.webp",
  "co-lovers": "assets/places/passeggiata-innamorati-generated.webp",
  "co-san-giorgio": "assets/places/piazza-san-giorgio-varenna-generated.webp",
  "co-villa-monastero": "assets/places/villa-monastero-generated.webp",
  "co-ferry-varenna": "assets/places/varenna-imbarcadero-generated.webp",
  "co-bellagio": "assets/places/bellagio-ferry-generated.webp",
  "co-salita": "assets/places/salita-serbelloni-generated.webp",
  "co-basilica": "assets/places/basilica-san-giacomo-bellagio-generated.webp",
  "co-spartivento": "assets/places/punta-spartivento-generated.webp",
  "co-pescallo": "assets/places/pescallo-generated.webp",
  "co-return": "assets/places/return-ferry-varenna-generated.webp",
  "mi-centrale": "assets/places/milano-centrale-generated.webp",
  "mi-duomo": "assets/places/duomo-milano-generated.webp",
  "mi-san-satiro": "assets/places/san-satiro-generated.webp",
  "mi-galleria": "assets/places/galleria-vittorio-generated.webp",
  "mi-scala": "assets/places/teatro-scala-generated.webp",
  "mi-brera": "assets/places/brera-generated.webp",
  "mi-castello": "assets/places/castello-sforzesco-generated.webp",
  "mi-sempione": "assets/places/parco-sempione-generated.webp",
  "mi-san-maurizio": "assets/places/san-maurizio-generated.webp",
  "mi-grazie": "assets/places/santa-maria-grazie-generated.webp",
  "mi-colonne": "assets/places/colonne-san-lorenzo-generated.webp",
  "mi-navigli": "assets/places/navigli-generated.webp"
});

const POINT_EDITORIAL_IMAGES = Object.freeze({
  "bg-porta-nuova": [
    { src: "../blog/assets/bergamo-jeden-dzien/bergamo-porta-nuova-900.webp", width: 900, height: 1200, alt: "Porta Nuova i widok na Città Alta w Bergamo", position: "50% 48%" },
    { src: "../blog/assets/bergamo-jeden-dzien/bergamo-pomnik-donizettiego-900.webp", width: 900, height: 1200, alt: "Martyna przy pomniku Gaetana Donizettiego w dolnym Bergamo", position: "50% 35%" }
  ],
  "d4-porta-nuova": [
    { src: "../blog/assets/bergamo-jeden-dzien/bergamo-porta-nuova-900.webp", width: 900, height: 1200, alt: "Porta Nuova i widok na Città Alta w Bergamo", position: "50% 48%" },
    { src: "../blog/assets/bergamo-jeden-dzien/bergamo-pomnik-donizettiego-900.webp", width: 900, height: 1200, alt: "Martyna przy pomniku Gaetana Donizettiego w dolnym Bergamo", position: "50% 35%" }
  ],
  "bg-mercato": [
    { src: "../blog/assets/bergamo-jeden-dzien/bergamo-via-gombito-900.webp", width: 900, height: 1200, alt: "Via Gombito prowadząca przez Città Alta w Bergamo", position: "50% 52%" },
    { src: "../blog/assets/bergamo-jeden-dzien/bergamo-boczna-uliczka-900.webp", width: 900, height: 1373, alt: "Spokojna brukowana uliczka w Città Alta", position: "50% 52%" }
  ],
  "bg-piazza-vecchia": [
    { src: "../blog/assets/bergamo-jeden-dzien/bergamo-piazza-vecchia-campanone-900.webp", width: 900, height: 1200, alt: "Piazza Vecchia i wieża Campanone w Bergamo", position: "50% 42%" },
    { src: "../blog/assets/bergamo-jeden-dzien/bergamo-palazzo-della-ragione-900.webp", width: 900, height: 962, alt: "Schody Palazzo della Ragione na Piazza Vecchia", position: "50% 47%" },
    { src: "../blog/assets/lombardia/bergamo-gelato-piazza-vecchia-900.webp", width: 900, height: 1200, alt: "Gelato na Piazza Vecchia w Bergamo", position: "50% 48%" }
  ],
  "bg-basilica": [
    { src: "../blog/assets/lombardia/bergamo-cappella-colleoni-900.webp", width: 900, height: 1200, alt: "Martyna przed Cappella Colleoni w Bergamo", position: "50% 42%" },
    { src: "../blog/assets/bergamo-jeden-dzien/bergamo-cappella-colleoni-martyna-900.webp", width: 814, height: 1600, alt: "Martyna na tle zdobionej fasady Cappella Colleoni", position: "50% 34%" }
  ],
  "bg-campanone": [
    { src: "../blog/assets/bergamo-jeden-dzien/bergamo-piazza-vecchia-campanone-900.webp", width: 900, height: 1200, alt: "Wieża Campanone nad Piazza Vecchia", position: "50% 35%" }
  ],
  "bg-colle-aperto": [
    { src: "../blog/assets/bergamo-jeden-dzien/bergamo-aperitivo-900.webp", width: 900, height: 1037, alt: "Aperitivo z przekąskami w Bergamo", position: "50% 50%" },
    { src: "../blog/assets/bergamo-jeden-dzien/bergamo-pizza-900.webp", width: 900, height: 1200, alt: "Pizza i kieliszek wina w Bergamo", position: "50% 42%" },
    { src: "../blog/assets/lombardia/bergamo-lokalny-lunch-900.webp", width: 900, height: 1129, alt: "Lokalny lunch z makaronem w Bergamo", position: "50% 50%" }
  ],
  "bg-porta-san-giacomo": [
    { src: "../blog/assets/bergamo-jeden-dzien/bergamo-porta-san-giacomo-900.webp", width: 900, height: 1200, alt: "Porta San Giacomo i widok na dolne Bergamo", position: "50% 48%" }
  ],
  "co-lovers": [
    { src: "../blog/assets/lombardia/varenna-promenada-jezioro-como-900.webp", width: 900, height: 1200, alt: "Martyna na promenadzie nad jeziorem Como w Varennie", position: "50% 47%" }
  ],
  "co-villa-monastero": [
    { src: "../blog/assets/lombardia/varenna-villa-monastero-900.webp", width: 900, height: 1200, alt: "Martyna na tarasie Villa Monastero nad jeziorem Como", position: "50% 43%" }
  ],
  "mi-duomo": [
    { src: "../blog/assets/lombardia/mediolan-duomo-martyna-900.webp", width: 900, height: 1389, alt: "Martyna przed katedrą Duomo w Mediolanie", position: "50% 40%" }
  ],
  "mi-galleria": [
    { src: "../blog/assets/lombardia/mediolan-mozaika-byka-900.webp", width: 900, height: 902, alt: "Mozaika z bykiem w Galleria Vittorio Emanuele II", position: "50% 50%" }
  ],
  "mi-castello": [
    { src: "../blog/assets/lombardia/mediolan-castello-sforzesco-900.webp", width: 900, height: 1164, alt: "Martyna przed Castello Sforzesco w Mediolanie", position: "50% 45%" }
  ]
});

const pointImage = point => POINT_IMAGE_OVERRIDES[point.id] || point.image;
const editorialImages = point => POINT_EDITORIAL_IMAGES[point.id] || [];

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = (value = "") => String(value).replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[char]));
const mapLink = query => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
const guideLink = point => `https://www.google.com/maps/dir/?api=1&destination=${point.lat}%2C${point.lng}&travelmode=walking`;

function responsiveImageAttributes(image, sizes) {
  const source = image.src;
  const responsive = /-900\.webp$/.test(source)
    ? ` srcset="${source.replace(/-900\.webp$/, "-520.webp")} 520w, ${source} ${image.width || 900}w" sizes="${sizes}"`
    : "";
  const dimensions = image.width && image.height ? ` width="${image.width}" height="${image.height}"` : "";
  return `src="${source}"${responsive}${dimensions}`;
}

let data = {};
let leafletMapInstance = null;
let leafletAnimationFrame = 0;
let placeReturnScroll = 0;
let placeTrigger = null;
let placeHistoryOwned = false;
let state = {
  day: 1,
  view: "home",
  routeMode: "full",
  done: [],
  saved: [],
  currentPoint: {},
  budget: {},
  energyByDay: {},
  delayPlans: {},
  preferences: { pace: "normal", interests: [], budget: "normal" },
  offlinePreparedAt: null
};

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved) state = {...state, ...saved, view: "home"};
  } catch (_) { /* fresh start */ }
  state.energyByDay ||= {};
  state.delayPlans ||= {};
  state.currentPoint ||= {};
  state.preferences = { pace: "normal", interests: [], budget: "normal", ...(state.preferences || {}) };
  delete state.unlockedBonuses;
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify({...state, view: undefined}));
}

async function loadData() {
  const values = await Promise.all(DATA_FILES.map(async name => {
    const response = await fetch(`data/${name}.json`);
    if (!response.ok) throw new Error(`${name}: ${response.status}`);
    return [name, await response.json()];
  }));
  data = Object.fromEntries(values);
  data.points = data.points.map(enrichPoint);
}

function enrichPoint(point) {
  // TODO(content): replace derived priorities and durations with Martyna's explicit editorial values when supplied.
  // Audio stays hidden until a real audioUrl/audio object exists; never substitute generated or placeholder recordings.
  const statuses = point.statuses || [];
  const quick = dayInfoRaw(point.day)?.quickIds?.includes(point.id);
  const priority = point.priority || (statuses.includes("OPCJONALNE") ? "optional" : quick ? "mustSee" : "recommended");
  const plannedMinutes = point.plannedMinutes || firstNumber(point.visit, point.type === "transport" ? 25 : 30);
  const minimumMinutes = point.minimumMinutes || Math.max(5, Math.round(plannedMinutes * (priority === "mustSee" ? .65 : .45) / 5) * 5);
  const energyWeight = point.energyWeight || (point.type === "transport" || point.type === "food" ? 1 : statuses.includes("OPCJONALNE") ? 3 : 2);
  const estimatedCost = point.estimatedCost ?? firstNumber(point.cost, 0);
  const editorialDetail = data.attractions?.[point.id] || data.attractions?.[PLACE_DETAIL_ALIASES[point.id]] || null;
  return {
    ...point,
    detail: placeDetail(point, editorialDetail),
    pointKind: editorialDetail ? "major" : "supporting",
    priority,
    plannedMinutes,
    minimumMinutes,
    energyWeight,
    estimatedCost,
    reservationStamp: point.reservationStamp || (point.id === "mi-grazie" ? "UWAGA: WYMAGANA REZERWACJA · POMIŃ, JEŚLI JEJ NIE MASZ" : null),
    indoor: point.indoor ?? false,
    outdoor: point.outdoor ?? ["attraction","photospot"].includes(point.type),
    audio: point.audio || (point.audioUrl ? {url: point.audioUrl, duration: point.audioDuration, title: point.audioTitle} : null),
    photoSpot: point.photoSpot || (point.type === "photospot" ? {instruction: point.description, bestTime: point.why} : null),
    bonus: point.bonus || null
  };
}

function placeDetail(point, editorial = null) {
  const typeLabels = {
    attraction: "MIEJSCE Z HISTORIĄ",
    photospot: "MIEJSCE I KADR",
    food: "MIEJSCE I SMAK",
    transport: "PUNKT W PODRÓŻY"
  };
  const practicalFacts = [
    `Znajdziesz to miejsce pod adresem: ${point.address}.`,
    `W planie warto przeznaczyć na nie ${point.visit}.`,
    `Koszt według założeń przewodnika: ${point.cost}.`,
    `Dostęp i godziny: ${point.opening}.`,
    point.next?.to
      ? `Po tym punkcie trasa prowadzi dalej w trybie ${point.next.mode} — około ${point.next.minutes} min (${point.next.distance}).`
      : `To ostatni punkt tego dnia; nie trzeba już dopasowywać kolejnego przejścia.`
  ];
  const defaultDescription = [
    point.description,
    `W planie to miejsce pełni konkretną rolę: ${point.why}`
  ];
  const editorialDescription = editorial?.description
    ? (Array.isArray(editorial.description) ? editorial.description : [editorial.description])
    : [];
  const descriptions = editorialDescription.length
    ? editorialDescription
    : [point.description, editorial?.history || defaultDescription[1]].filter(Boolean);
  const sources = editorial?.sources?.length
    ? editorial.sources
    : point.officialUrl
      ? [{ label: "Oficjalna strona miejsca", url: point.officialUrl }]
      : [];

  return {
    ...(editorial || {}),
    tag: editorial?.tag || typeLabels[point.type] || "PUNKT NA TRASIE",
    description: descriptions,
    facts: editorial?.facts?.length ? editorial.facts.slice(0, 5) : practicalFacts,
    sources
  };
}

function dayInfoRaw(day) {
  return data.destinations?.find(item => item.day === Number(day));
}

function firstNumber(value, fallback = 0) {
  const match = String(value || "").replace(",", ".").match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : fallback;
}

function pointsForDay(day = state.day) {
  return data.points.filter(point => point.day === Number(day)).sort((a, b) => a.order - b.order);
}

function majorPointsForDay(day = state.day) {
  return pointsForDay(day).filter(point => point.pointKind === "major");
}

function dayInfo(day = state.day) {
  return data.destinations.find(item => item.day === Number(day));
}

function completedForDay(day) {
  const ids = pointsForDay(day).map(point => point.id);
  return ids.filter(id => state.done.includes(id)).length;
}

function energyMode(day = state.day) {
  return state.energyByDay[day] || "full";
}

function isEnergyExcluded(point) {
  const mode = energyMode(point.day);
  if (mode === "full") return false;
  if (mode === "normal") return point.priority === "optional" && point.energyWeight >= 3;
  if (mode === "calm") return point.priority !== "mustSee" && point.type !== "transport" && point.type !== "food" && (point.priority === "optional" || point.energyWeight >= 2);
  return false;
}

function activePointsForDay(day = state.day) {
  return pointsForDay(day).filter(point => !disabledModeFor(point));
}

function logicalPosition(day = state.day) {
  const points = activePointsForDay(day);
  if (!points.length) return { current: null, next: null, index: -1, points };
  const selectedId = state.currentPoint[day];
  const selectedIndex = points.findIndex(point => point.id === selectedId);
  if (selectedIndex >= 0) return { current: points[selectedIndex], next: points[selectedIndex + 1] || null, index: selectedIndex, points };
  if (selectedId) {
    const selectedPoint = pointsForDay(day).find(point => point.id === selectedId);
    const nextIndex = selectedPoint ? points.findIndex(point => point.order > selectedPoint.order) : -1;
    if (selectedPoint) return { current: selectedPoint, next: nextIndex >= 0 ? points[nextIndex] : null, index: nextIndex - 1, points };
  }
  const lastDoneIndex = points.reduce((last, point, index) => state.done.includes(point.id) ? index : last, -1);
  return { current: lastDoneIndex >= 0 ? points[lastDoneIndex] : null, next: points[lastDoneIndex + 1] || points[0], index: lastDoneIndex, points };
}

function toast(message) {
  const element = $("#toast");
  element.textContent = message;
  element.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => element.classList.remove("show"), 1800);
}

function minutesFromTime(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

function timeFromMinutes(value) {
  const normalized = ((Math.round(value) % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, "0")}:${String(normalized % 60).padStart(2, "0")}`;
}

function humanDuration(minutes) {
  const rounded = Math.max(0, Math.round(minutes / 5) * 5);
  const hours = Math.floor(rounded / 60);
  const rest = rounded % 60;
  if (!hours) return `około ${rest} min`;
  return `około ${hours} h${rest ? ` ${rest} min` : ""}`;
}

function baseActivePoints(day = state.day) {
  const info = dayInfo(day);
  return pointsForDay(day).filter(point => {
    if (state.routeMode === "rain" && (info.rainDisabledIds || []).includes(point.id)) return false;
    if (state.routeMode === "quick" && !info.quickIds.includes(point.id)) return false;
    if (isEnergyExcluded(point)) return false;
    return true;
  });
}

function travelMinutesBetween(from, to) {
  if (!from || !to) return 0;
  if (from.next?.to === to.id) return Number(from.next.minutes) || 0;
  return Math.max(3, Math.round(haversine(from, to) / 4.2 * 60));
}

function planStats(day = state.day) {
  const points = activePointsForDay(day);
  const doneIds = new Set(state.done);
  const remaining = points.filter(point => !doneIds.has(point.id));
  const delay = state.delayPlans[day] || {};
  const visitMinutes = remaining.reduce((total, point) => total + (delay.shortened?.[point.id] || point.plannedMinutes), 0);
  const travelMinutes = remaining.reduce((total, point, index) => total + travelMinutesBetween(index ? remaining[index - 1] : logicalPosition(day).current, point), 0);
  const cost = remaining.reduce((total, point) => total + (Number(point.estimatedCost) || 0), 0);
  const distance = remaining.reduce((total, point, index) => {
    const previous = index ? remaining[index - 1] : logicalPosition(day).current;
    return total + haversine(previous, point);
  }, 0);
  return { points, remaining, visitMinutes, travelMinutes, totalMinutes: visitMinutes + travelMinutes, cost, distance };
}

function createDelayPlan(minutes) {
  const target = Math.max(15, Number(minutes) || 30);
  const remaining = baseActivePoints().filter(point => !state.done.includes(point.id));
  const protectedTypes = new Set(["transport", "food"]);
  const optional = remaining.filter(point => point.priority === "optional" && !protectedTypes.has(point.type)).sort((a, b) => b.energyWeight - a.energyWeight || b.order - a.order);
  const recommended = remaining.filter(point => point.priority === "recommended" && !protectedTypes.has(point.type)).sort((a, b) => b.energyWeight - a.energyWeight || b.order - a.order);
  const skippedIds = [];
  const shortened = {};
  let saved = 0;

  optional.forEach(point => {
    if (saved >= target) return;
    skippedIds.push(point.id);
    saved += point.plannedMinutes + Math.min(15, Number(point.next?.minutes) || 0);
  });
  recommended.forEach(point => {
    if (saved >= target) return;
    const gain = Math.max(0, point.plannedMinutes - point.minimumMinutes);
    if (gain) {
      shortened[point.id] = point.minimumMinutes;
      saved += gain;
    }
  });
  remaining.filter(point => point.priority === "mustSee" && !protectedTypes.has(point.type)).forEach(point => {
    if (saved >= target) return;
    const gain = Math.max(0, point.plannedMinutes - point.minimumMinutes);
    if (gain) {
      shortened[point.id] = point.minimumMinutes;
      saved += gain;
    }
  });
  while (saved < target) {
    const candidates = recommended.filter(point => !skippedIds.includes(point.id)).map(point => {
      const priorGain = shortened[point.id] ? point.plannedMinutes - shortened[point.id] : 0;
      const fullGain = point.plannedMinutes + Math.min(15, Number(point.next?.minutes) || 0);
      return {point, nextSaved: saved - priorGain + fullGain};
    }).sort((a, b) => Math.abs(a.nextSaved - target) - Math.abs(b.nextSaved - target));
    const best = candidates[0];
    if (!best || Math.abs(best.nextSaved - target) >= Math.abs(saved - target)) break;
    skippedIds.push(best.point.id);
    delete shortened[best.point.id];
    saved = best.nextSaved;
  }

  return {
    minutes: target,
    saved: Math.round(saved),
    skippedIds,
    shortened,
    createdAt: new Date().toISOString()
  };
}

function sheetOpen(html) {
  $("#sheetContent").innerHTML = html;
  $("#sheetBackdrop").hidden = false;
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() => $("#assistantSheet").focus());
}

function sheetClose() {
  $("#sheetBackdrop").hidden = true;
  document.body.style.overflow = "";
}

function renderWhatsNowSheet() {
  const position = logicalPosition();
  const next = position.next;
  const after = next ? position.points[position.points.indexOf(next) + 1] : null;
  if (!next) {
    return sheetOpen(`<span class="kicker">Plan dnia</span><h2 id="sheetTitle">To już wszystko</h2><p class="sheet-intro">Wszystkie aktywne punkty tego dnia są za Tobą.</p><button class="sheet-secondary" data-action="sheet-close">Wróć do planu</button>`);
  }
  const travel = travelMinutesBetween(position.current, next);
  const nearestFood = position.points.slice(position.points.indexOf(next)).find(point => point.type === "food");
  const context = nearestFood ? `Najbliższy zaplanowany przystanek na jedzenie: <b>${escapeHtml(nearestFood.name)}</b>.` : "Na trasie nie ma kolejnego zaplanowanego przystanku na jedzenie — użyj przycisku Pomoc, jeśli potrzebujesz czegoś teraz.";
  sheetOpen(`<span class="kicker">Co teraz?</span><h2 id="sheetTitle">${position.current ? "Następny krok" : "Zacznij tutaj"}</h2><p class="sheet-intro">To wskazówka z zapisanego planu, bez udawania danych GPS ani informacji na żywo.</p>
    <div class="now-main"><span class="recommendation-label ${recommendationFor(next).className}">${recommendationFor(next).label}</span><h3>${escapeHtml(next.name)}</h3><div class="now-facts">${travel ? `<span>około ${travel} min drogi</span>` : ""}<span>${escapeHtml(next.visit)}</span><span>${escapeHtml(next.cost)}</span></div><p>${escapeHtml(next.description)}</p><a class="sheet-cta" href="${guideLink(next)}" target="_blank" rel="noopener">Prowadź mnie w Google Maps</a><button class="sheet-secondary" data-action="set-current" data-id="${next.id}">Jestem już tutaj</button></div>
    ${after ? `<div class="then-card"><b>Potem: ${escapeHtml(after.name)}</b><br><span>${escapeHtml(after.visit)} · ${escapeHtml(after.cost)}</span></div>` : `<div class="then-card"><b>Potem: koniec aktywnego planu</b></div>`}
    <div class="context-note">${context}</div>`);
}

function renderDelaySheet(plan = null) {
  if (!plan) {
    const options = [[30, "30 min"], [60, "1 godzina"], [120, "2 godziny"], [180, "3 godziny"]];
    return sheetOpen(`<span class="kicker">Plan awaryjny</span><h2 id="sheetTitle">Ile masz opóźnienia?</h2><p class="sheet-intro">Najpierw pomijam punkty opcjonalne, później skracam polecane. Nie usuwam transportu, jedzenia ani punktów „Nie pomijaj”.</p><div class="choice-grid">${options.map(([value, label]) => `<button data-action="delay-preview" data-minutes="${value}">${label}</button>`).join("")}</div><button class="sheet-secondary" data-action="delay-clear">Przywróć pełny plan</button>`);
  }
  const skipped = plan.skippedIds.map(id => data.points.find(point => point.id === id)).filter(Boolean);
  const shortened = Object.entries(plan.shortened).map(([id, value]) => ({ point: data.points.find(item => item.id === id), value })).filter(item => item.point);
  const kept = baseActivePoints().filter(point => !plan.skippedIds.includes(point.id) && !state.done.includes(point.id));
  sheetOpen(`<span class="kicker">Proponowana zmiana</span><h2 id="sheetTitle">Odzyskujemy około ${plan.saved} min</h2><p class="sheet-intro">Plan jest deterministyczny i opiera się na priorytetach zapisanych w przewodniku. Możesz go zastosować albo wybrać inne opóźnienie.</p><div class="plan-change">
    ${kept.length ? `<div class="change-row keep"><b>Zostają najważniejsze</b>${kept.slice(0, 5).map(point => escapeHtml(point.name)).join(" · ")}</div>` : ""}
    ${shortened.length ? `<div class="change-row shorten"><b>Skróć pobyt</b>${shortened.map(item => `${escapeHtml(item.point.name)} do około ${item.value} min`).join(" · ")}</div>` : ""}
    ${skipped.length ? `<div class="change-row skip"><b>Pomiń</b>${skipped.map(point => escapeHtml(point.name)).join(" · ")}</div>` : `<div class="change-row keep"><b>Nic nie usuwamy</b>W aktywnej trasie nie ma już bezpiecznych punktów do pominięcia.</div>`}
    </div><button class="sheet-cta" data-action="delay-apply" data-minutes="${plan.minutes}">Zastosuj ten plan</button><button class="sheet-secondary" data-action="delay-open">Wybierz inne opóźnienie</button>`);
}

function renderSosSheet() {
  const choices = [
    ["train", "Pociąg / autobus nie jedzie"], ["rain", "Zaczyna padać"], ["closed", "Restauracja jest zamknięta"],
    ["hungry", "Muszę coś zjeść"], ["toilet", "Szukam toalety"], ["pharmacy", "Potrzebuję apteki"],
    ["lodging", "Jak wrócić do noclegu"], ["lost", "Zgubiłam się"], ["battery", "Kończy mi się bateria"]
  ];
  sheetOpen(`<span class="kicker">Szybka pomoc</span><h2 id="sheetTitle">Co się stało?</h2><p class="sheet-intro">Dostaniesz krótki, praktyczny plan. W sprawach rozkładów i otwarcia zawsze odsyłam do aktualnego źródła.</p><div class="sos-grid">${choices.map(([id, label]) => `<button data-action="sos-detail" data-kind="${id}">${label}</button>`).join("")}</div>`);
}

function renderSosDetail(kind) {
  const city = dayInfo().city;
  const next = logicalPosition().next;
  const current = logicalPosition().current;
  const officialTransport = data.transport.find(item => item.day === state.day)?.url || "https://www.trenord.it/en/routes-and-timetables/journey/";
  const actions = {
    train: ["Połączenie nie jedzie", "Sprawdź komunikat przewoźnika i numer połączenia. Nie zakładam, że rozkład zapisany wcześniej jest nadal aktualny.", `<a class="sheet-cta" href="${officialTransport}" target="_blank" rel="noopener">Sprawdź aktualne połączenie</a><button class="sheet-secondary" data-action="delay-open">Przelicz plan po opóźnieniu</button>`],
    rain: ["Przełącz na plan deszczowy", "Punkty zewnętrzne pozostaną widoczne, ale wygaszone i bez nawigacji. Kolejność dnia się nie rozsypie.", `<button class="sheet-cta" data-action="set-route-mode" data-mode-value="rain">Włącz plan na deszcz</button>`],
    closed: ["Restauracja jest zamknięta", "Nie trać czasu na szukanie przypadkowego miejsca. Otwórz sprawdzone propozycje z tego dnia i potwierdź aktualne godziny na stronie lokalu lub w Mapach.", `<button class="sheet-cta" data-action="open-food">Pokaż inne miejsca na jedzenie</button>`],
    hungry: ["Znajdź jedzenie", "Otworzę sprawdzone propozycje przypisane do tego dnia. Aktualne godziny potwierdź na stronie lokalu lub w Mapach.", `<button class="sheet-cta" data-action="open-food">Pokaż jedzenie na dziś</button>`],
    toilet: ["Najbliższa toaleta", "Wyniki pochodzą z Google Maps i mogą wymagać potwierdzenia na miejscu.", `<a class="sheet-cta" href="${mapLink(`toaleta publiczna ${city}`)}" target="_blank" rel="noopener">Szukaj w Google Maps</a>`],
    pharmacy: ["Najbliższa apteka", "W Mapach sprawdź oznaczenie „otwarte” i zadzwoń, jeśli sytuacja jest pilna.", `<a class="sheet-cta" href="${mapLink(`farmacia ${city}`)}" target="_blank" rel="noopener">Szukaj apteki w Google Maps</a>`],
    lodging: ["Wróć do noclegu", "Przewodnik nie przechowuje adresu noclegu. Otwórz zapisany obiekt w Google Maps albo użyj adresu z potwierdzenia rezerwacji.", `<a class="sheet-cta" href="https://www.google.com/maps" target="_blank" rel="noopener">Otwórz Google Maps</a>`],
    lost: ["Spokojnie — wróć do trasy", current ? `Ostatnio oznaczony punkt to ${escapeHtml(current.name)}. Otwórz go w Mapach i porównaj swoją pozycję.` : "Nie wybrano jeszcze miejsca „Jestem tutaj”. Otwórz najbliższy punkt planu w Mapach.", `<a class="sheet-cta" href="${guideLink(current || next || pointsForDay()[0])}" target="_blank" rel="noopener">Otwórz trasę w Google Maps</a>`],
    battery: ["Oszczędzaj baterię", "Włącz tryb oszczędzania energii, zmniejsz jasność, zrób zrzut adresu kolejnego punktu i używaj nawigacji tylko na skrzyżowaniach. Tekst przewodnika działa offline po wcześniejszym przygotowaniu.", `<button class="sheet-cta" data-action="offline-prepare">Przygotuj przewodnik offline</button>`]
  };
  const [title, body, cta] = actions[kind] || actions.lost;
  sheetOpen(`<span class="kicker">Pomoc</span><h2 id="sheetTitle">${title}</h2><p class="sheet-intro">${body}</p><div class="now-main">${cta}</div><button class="sheet-secondary" data-action="sos-open">Wróć do listy problemów</button>`);
}

function renderDayTabs(targetId) {
  const target = $(`#${targetId}`);
  target.innerHTML = data.destinations.map(day => `<button class="${day.day === state.day ? "active" : ""}" data-action="switch-day" data-day="${day.day}">Dzień ${day.day}</button>`).join("");
}

function renderHome() {
  $("#dayCards").innerHTML = data.destinations.map(day => {
    const count = pointsForDay(day.day).length;
    const completed = completedForDay(day.day);
    const percent = count ? Math.round(completed / count * 100) : 0;
    return `<button class="day-card" data-action="open-day" data-day="${day.day}" style="--accent:${day.accent}">
      <img src="${day.hero}" alt="${escapeHtml(day.city)}" loading="lazy">
      <span class="day-card-content"><span class="day-no">Dzień ${day.day} · ${escapeHtml(day.duration)}</span><h3>${escapeHtml(day.city)}</h3><p>${escapeHtml(day.subtitle)}</p><span class="progress-line" role="progressbar" aria-label="Postęp dnia ${day.day}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><i style="width:${percent}%"></i></span></span>
      <span class="arrow" aria-hidden="true">→</span>
    </button>`;
  }).join("");
  $("#sourceNotice").innerHTML = `Ostatnia aktualizacja: <b>${formatDate(data.sources.updated)}</b>. ${escapeHtml(data.sources.notice)}`;
}

function routeDistance(points) {
  return points.reduce((total, point, index) => index ? total + haversine(points[index - 1], point) : total, 0);
}

function renderDayAssistant() {
  const day = dayInfo();
  const allPoints = pointsForDay();
  const stats = planStats();
  const activeDone = stats.points.filter(point => state.done.includes(point.id)).length;
  const percent = stats.points.length ? Math.min(100, Math.round(activeDone / stats.points.length * 100)) : 0;
  const position = logicalPosition();
  const nextIndex = position.next ? position.points.indexOf(position.next) : position.points.length;
  const upcoming = [];
  let accumulated = 0;
  position.points.slice(Math.max(0, nextIndex)).forEach((point, index) => {
    if (upcoming.length && accumulated >= 180) return;
    const previous = index ? position.points[Math.max(0, nextIndex) + index - 1] : position.current;
    accumulated += travelMinutesBetween(previous, point);
    const scheduled = minutesFromTime(point.time);
    upcoming.push({ point, time: scheduled === null ? timeFromMinutes((minutesFromTime(day.startTime) || 9 * 60) + accumulated) : point.time });
    accumulated += state.delayPlans[state.day]?.shortened?.[point.id] || point.plannedMinutes;
  });
  const finishBase = upcoming[0] ? minutesFromTime(upcoming[0].time) : minutesFromTime(day.startTime);
  const finish = stats.remaining.length && finishBase !== null ? timeFromMinutes(finishBase + stats.totalMinutes) : "—";
  const fullDistance = routeDistance(allPoints);
  const activeDistance = routeDistance(stats.points);
  const energyLabels = { full: "Mam dużo energii", normal: "Normalnie", calm: "Spokojnie" };

  $("#dayAssistant").innerHTML = `<article class="assistant-card">
      <span class="kicker">Dopasuj tempo</span><h2>Ile masz energii?</h2>
      <div class="energy-selector">${Object.entries(energyLabels).map(([mode, label]) => `<button class="energy-button ${energyMode() === mode ? "active" : ""}" data-action="set-energy" data-energy="${mode}">${label}</button>`).join("")}</div>
      <p class="energy-comparison"><b>${stats.points.length} z ${allPoints.length} punktów</b> · około ${activeDistance.toFixed(1).replace(".", ",")} km trasy${fullDistance > activeDistance ? ` zamiast ${fullDistance.toFixed(1).replace(".", ",")} km` : ""}. Pominięte miejsca pozostają widoczne i bez nawigacji.</p>
    </article>
    <article class="assistant-card">
      <span class="kicker">Najbliższe 3 godziny</span><h2>${position.next ? "Co jest przed Tobą" : "Plan ukończony"}</h2>
      <div class="upcoming-hours">${upcoming.slice(0, 4).map(({point, time}) => `<div class="hour-item"><time>${escapeHtml(time)}</time><span class="hour-line"></span><span><b>${escapeHtml(point.name)}</b><small>${state.delayPlans[state.day]?.shortened?.[point.id] ? `około ${state.delayPlans[state.day].shortened[point.id]} min · skrócone` : escapeHtml(point.visit)}</small></span></div>`).join("") || `<div class="empty-state">Nie ma już kolejnych punktów.</div>`}</div>
      <p class="tiny-note">Planowane zakończenie dnia: ${finish === "—" ? "po ostatnim aktywnym punkcie" : `około ${finish}`}.</p>
      <div class="assistant-actions"><button class="strong" data-action="whats-now">Co mam zrobić teraz?</button><button data-action="delay-open">Mam opóźnienie</button><button data-action="sos-open">Potrzebuję pomocy</button></div>
    </article>
    <article class="assistant-card progress-card ${percent === 100 ? "is-complete" : ""}">
      <div class="day-progress-head"><div><span class="kicker">Postęp dnia</span><h2>${percent === 100 ? "Dzień ukończony" : `${activeDone} z ${stats.points.length} punktów`}</h2></div><strong>${percent}%</strong></div>
      <div class="progress-line progress-meter" role="progressbar" aria-label="Postęp zwiedzania dnia" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-valuetext="Ukończono ${activeDone} z ${stats.points.length} punktów"><i style="width:${percent}%"></i></div>
      <div class="day-progress-stats"><div><span>zostało</span><b>${stats.remaining.length} miejsc</b></div><div><span>dystans</span><b>około ${stats.distance.toFixed(1).replace(".", ",")} km</b></div><div><span>czas</span><b>${humanDuration(stats.totalMinutes)}</b></div><div><span>orientacyjny koniec</span><b>${finish}</b></div></div>
      <p class="tiny-note">Pozostały koszt miejsc: orientacyjnie około ${Math.round(stats.cost)} €. Sprawdź aktualne ceny i godziny w źródłach przy kartach.</p>
    </article>`;
}

function renderDay() {
  const day = dayInfo();
  const allPoints = pointsForDay();
  const dayMood = {
    1: "Zaczynamy od Bergamo.",
    2: "Dzisiaj zwalniamy nad jeziorem.",
    3: "Mediolan układa się w jeden logiczny spacer.",
    4: "Spokojny finał z bezpiecznym zapasem."
  };
  $("#dayHero").style.backgroundImage = `url('${day.hero}')`;
  $("#dayHero").style.backgroundPosition = state.day === 2 ? "55% 52%" : "center";
  $("#dayHero").innerHTML = `<div class="day-hero-content"><span class="eyebrow">Dzień ${day.day} · start ${escapeHtml(day.startTime)}</span><h1>${escapeHtml(day.city)}</h1><p class="day-mood">${dayMood[day.day]}</p><p class="day-summary-copy">${escapeHtml(day.summary)}</p><button class="day-start-button" data-action="scroll-plan">Rozpocznij dzień <span aria-hidden="true">→</span></button></div>`;
  renderDayTabs("dayTabs");
  $("#dayMeta").innerHTML = [
    ["dystans", `${day.distanceKm} km`], ["intensywność", day.intensity], ["czas", day.duration], ["budżet dnia", day.cost]
  ].map(([label,value]) => `<div class="meta-cell"><span>${label}</span><b>${escapeHtml(value)}</b></div>`).join("");
  $$(".mode-button").forEach(button => button.classList.toggle("active", button.dataset.mode === state.routeMode));
  const note = $("#routeModeNote");
  if (state.routeMode === "quick") {
    note.hidden = false;
    note.innerHTML = `<b>Skrót dnia:</b> ${escapeHtml(day.quickNote)} Przygaszone punkty pozostają na liście, aby zachować kolejność, ale nawigacja do nich jest wyłączona.`;
  } else if (state.routeMode === "rain") {
    note.hidden = false;
    note.innerHTML = `<b>Plan na deszcz:</b> ${day.rain.map(escapeHtml).join(" · ")}. Przygaszone punkty pozostają na liście, aby zachować kolejność, ale nawigacja do nich jest wyłączona.`;
  } else if (state.delayPlans[state.day]) {
    note.hidden = false;
    note.innerHTML = `<b>Plan po opóźnieniu:</b> odzyskujemy około ${state.delayPlans[state.day].saved} min. Pominięte miejsca są przygaszone, a skrócone wizyty wyraźnie oznaczone.`;
  } else if (energyMode() !== "full") {
    note.hidden = false;
    note.innerHTML = `<b>Dopasowane tempo:</b> mniej ważne lub bardziej męczące miejsca pozostają widoczne, ale nawigacja do nich jest wyłączona.`;
  } else note.hidden = true;
  renderDayTravelNotice();
  renderDayAssistant();
  $("#dayTimeline").innerHTML = allPoints.map(point => pointCard(point, disabledModeFor(point))).join("");
  const emergency = data.emergency.find(item => item.day === state.day);
  $("#dayExtras").innerHTML = `
    ${emergency ? `<article class="info-card emergency-card"><span class="kicker">Najpierw przeczytaj</span><h3>${escapeHtml(emergency.title)}</h3><ol>${emergency.steps.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol><a class="official-link" href="${emergency.officialUrl}" target="_blank" rel="noopener">Sprawdź aktualne źródło ↗</a></article>` : ""}
    <article class="info-card"><span class="kicker">Jeśli masz energię</span><h3>Dodatkowe punkty</h3><ul>${day.extra.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></article>
    <article class="info-card martyna-tip"><div class="martyna-tip-head"><img src="assets/logo-martyna.webp" alt="" aria-hidden="true"><span class="kicker">Tip Martyny</span></div><h3>Zrób to sprytniej</h3><blockquote>${escapeHtml(day.tip)}</blockquote><cite>— Martyna</cite></article>
    <article class="info-card warning"><span class="kicker">Możesz odpuścić</span><h3>Oszczędź czas</h3><p>${escapeHtml(day.skip)}</p></article>
    <article class="info-card"><span class="kicker">Zmęczenie</span><h3>${escapeHtml(day.intensity)}</h3><p>${escapeHtml(day.elevation)}</p></article>`;
  renderRoutes();
}

function renderDayTravelNotice() {
  const target = $("#dayTravelNotice");
  if (!target) return;
  if (state.day !== 2) {
    target.innerHTML = "";
    return;
  }
  const extraWorksActive = Date.now() <= Date.parse("2026-08-21T21:59:59Z");
  target.innerHTML = `<article class="rail-works-card" aria-labelledby="railWorksTitle">
    <div class="rail-works-head">
      <span class="rail-alert-mark" aria-hidden="true">!</span>
      <div><span class="kicker">Ważne przed wyjazdem nad Como</span><h2 id="railWorksTitle">Do Varenny jedziesz przez remont</h2></div>
      <div class="rail-date-stack"><span>autobus zastępczy</span><b>planowane do 31.12.2026</b></div>
    </div>
    <p class="rail-intro">Pociągi nie kursują między Bergamo a Ponte San Pietro. Pierwszy odcinek pokonujesz autobusem zastępczym, a potem przesiadasz się na pociągi przez Lecco.</p>
    <div class="rail-route" aria-label="Trasa: Bergamo, Ponte San Pietro, Lecco, Varenna-Esino">
      <span><i>1</i><b>Bergamo</b><small>autobus zastępczy</small></span><em aria-hidden="true">→</em>
      <span><i>2</i><b>Ponte S. Pietro</b><small>pociąg do Lecco</small></span><em aria-hidden="true">→</em>
      <span><i>3</i><b>Lecco</b><small>drugi pociąg</small></span><em aria-hidden="true">→</em>
      <span><i>4</i><b>Varenna-Esino</b><small>wysiadasz</small></span>
    </div>
    <div class="rail-pass">
      <div class="rail-pass-copy"><span class="kicker">Bilet bez nieporozumień</span><h3>Wybierz jedną z dwóch opcji</h3><p>Obie pozwalają przejechać autobusami zastępczymi i pociągami regionalnymi. Nie kupujesz ich jednocześnie.</p></div>
      <div class="rail-ticket-options">
        <div><span>Opcja A</span><b>Zwykły bilet odcinkowy</b><p>W aplikacji wybierz relację <strong>Bergamo → Varenna-Esino</strong>. Jeden bilet obejmuje wskazany przez planer autobus zastępczy oraz pociągi na tej trasie.</p></div>
        <div><span>Opcja B</span><b>IVOL — przejazdy bez limitu</b><p>Dobry, jeśli tego samego dnia korzystasz też z innych pociągów, autobusów lub komunikacji miejskiej w Lombardii.</p></div>
      </div>
      <div class="rail-pass-prices" aria-label="Ceny biletu IVOL"><span><b>1 dzień</b>17,50 €</span><span><b>2 dni</b>29 €</span><span><b>3 dni</b>35 €</span><span><b>7 dni</b>46,50 €</span></div>
      <p class="rail-pass-warning"><b>Ważne:</b> IVOL nie zastępuje biletu na prom Varenna ↔ Bellagio — prom kupujesz osobno.</p>
      <a href="https://www.trenord.it/en/tickets/travel-titles/daily-tickets/" target="_blank" rel="noopener">Sprawdź IVOL w Trenord ↗</a>
    </div>
    <div class="rail-key-note"><b>Jak znaleźć właściwy autobus?</b><p>Standardowo odjeżdża z <strong>Piazzale Guglielmo Marconi</strong>, przed dworcem kolejowym. Stań plecami do głównego wejścia — wiata jest po prawej, obok foodtrucka i parkingu rowerowego. Szukaj białego autokaru NorisViaggi z kartką „Ponte S. Pt”. To nie jest autobus miejski ATB i nie jedzie bezpośrednio do Lecco.</p></div>
    ${extraWorksActive ? `<div class="rail-temporary"><span>Do 21.08.2026</span><p>Trwają dodatkowe prace między Calolziocorte a Ponte San Pietro. Dla części zmienionych kursów RFI wskazuje <b>pensilinę 10 Autostazione przy Via Bartolomeo Bono</b>, a autobus może jechać do Calolziocorte lub — 21 sierpnia — aż do Lecco. Dokładny wariant z planera Trenord ma pierwszeństwo.</p></div>` : ""}
    <ol class="rail-checklist">
      <li><b>Wybierz bilet:</b> zwykły Bergamo → Varenna-Esino albo IVOL. Jeden z nich wystarczy na całą trasę lądową.</li>
      <li><b>W Bergamo:</b> przyjdź 30 minut wcześniej i znajdź biały autokar z kartką „Ponte S. Pt”.</li>
      <li><b>W Ponte San Pietro:</b> po wyjściu z autobusu odwróć się do stacji, wejdź i skręć w prawo. Obejdź tory dookoła do pociągu jadącego do Lecco — najczęściej odjeżdża z peronu 2, ale potwierdź go na tablicy.</li>
      <li><b>W Lecco:</b> przesiądź się do drugiego pociągu. Na tablicy szukaj Varenna-Esino; zwykle będzie to kierunek Colico, Sondrio albo Tirano.</li>
    </ol>
    <div class="rail-actions"><a href="https://mediolanbergamo.pl/autobus-z-bergamo-do-lecco/" target="_blank" rel="noopener">Zobacz opis i zdjęcia przystanku ↗</a><a href="https://www.trenord.it/en/routes-and-timetables/journey/" target="_blank" rel="noopener">Sprawdź połączenie w Trenord ↗</a></div>
    <p class="rail-source-note">Lokalizacja i wygląd autobusu: MediolanBergamo.pl. Termin remontu i zmiany ruchu: RFI. Rozkład sprawdź ponownie dzień wcześniej i rano.</p>
  </article>`;
}

function disabledModeFor(point) {
  const day = dayInfo(point.day);
  if (state.routeMode === "rain" && (day.rainDisabledIds || []).includes(point.id)) return "rain";
  if (state.routeMode === "quick" && !day.quickIds.includes(point.id)) return "quick";
  if ((state.delayPlans[point.day]?.skippedIds || []).includes(point.id)) return "delay";
  if (isEnergyExcluded(point)) return "energy";
  return null;
}

function recommendationFor(point) {
  if (point.priority === "mustSee") return { label: "Nie pomijaj", className: "must-see" };
  if (point.priority === "optional") return { label: "Jeśli masz czas · możesz odpuścić", className: "optional" };
  return { label: (point.statuses || []).includes("WARTO") ? "Martyna poleca" : "W planie", className: "recommended" };
}

function matchesPreference(point) {
  const map = { food: "jedzenie", photospot: "zdjęcia", attraction: "zabytki" };
  return state.preferences.interests.includes(map[point.type]);
}

function pointCard(point, disabledMode = null) {
  const day = dayInfo(point.day);
  const done = state.done.includes(point.id);
  const saved = state.saved.includes(point.id);
  const nextPoint = point.next ? data.points.find(item => item.id === point.next.to) : null;
  const disabled = Boolean(disabledMode);
  const disabledCopy = ({
    rain: { icon: "☂", title: "Wyłączone ze zwiedzania przez deszcz", body: "Ten punkt jest głównie na zewnątrz lub wymaga odcinka, którego nie polecamy przy tej pogodzie.", skip: "Ten odcinek pomijamy w trybie deszczowym" },
    quick: { icon: "◷", title: "Pomijamy, bo masz mało czasu", body: "Ten punkt nie mieści się w skróconej trasie. Zostawiamy go na liście, aby zachować pełną kolejność dnia.", skip: "Ten odcinek pomijamy w skróconej trasie" },
    delay: { icon: "◷", title: "Pomijamy po uwzględnieniu opóźnienia", body: "Zostawiam najważniejsze punkty i odzyskuję czas bez zmiany kolejności trasy.", skip: "Ten odcinek pomijamy w planie po opóźnieniu" },
    energy: { icon: "—", title: "Pomijamy w spokojniejszym tempie", body: "To mniej istotny lub bardziej męczący punkt. Najważniejsze miejsca nadal zostają w planie.", skip: "Ten odcinek pomijamy w spokojniejszej wersji" }
  })[disabledMode] || { icon: "—", title: "Punkt poza aktywnym planem", body: "Ten punkt pozostaje widoczny dla zachowania pełnej trasy.", skip: "Ten odcinek pomijamy" };
  const recommendation = recommendationFor(point);
  const isCurrent = state.currentPoint[point.day] === point.id;
  const shortened = state.delayPlans[point.day]?.shortened?.[point.id];
  const realImages = editorialImages(point);
  const cardImages = realImages.length ? realImages : point.images?.length ? point.images : [{ src: pointImage(point) || day.hero, alt: point.name, position: point.position || "center" }];
  const cardImageMarkup = cardImages.length === 1
    ? `<div class="point-image-frame"><img class="point-image" ${responsiveImageAttributes(cardImages[0], "(max-width: 719px) calc(100vw - 32px), 310px")} style="object-position:${cardImages[0].position || "center"}" alt="${escapeHtml(cardImages[0].alt || point.name)}" loading="lazy" decoding="async">${realImages.length ? `<span class="photo-source">kadr Martyny</span>` : ""}</div>`
    : `<div class="point-image-stack" data-count="${Math.min(cardImages.length, 2)}">${cardImages.slice(0, 2).map(image => `<img class="point-image" ${responsiveImageAttributes(image, "(max-width: 719px) 50vw, 310px")} style="object-position:${image.position || "center"}" alt="${escapeHtml(image.alt || point.name)}" loading="lazy" decoding="async">`).join("")}${realImages.length ? `<span class="photo-source">kadry Martyny</span>` : ""}</div>`;
  return `<article class="point-card ${point.pointKind === "major" ? "major-point" : "supporting-point"} ${done ? "completed" : ""} ${isCurrent ? "is-current" : ""} ${disabled ? `mode-disabled ${disabledMode}-disabled` : ""}" data-order="${point.order}" data-place-id="${point.id}" id="point-${point.id}" style="--point-accent:${day.accent}" ${disabled ? `aria-disabled="true"` : ""}>
    ${cardImageMarkup}
    <div class="point-content">
      ${done ? `<span class="completion-badge" role="status">✓ Ukończone</span>` : ""}
      <div class="point-top"><div><span class="point-time">${escapeHtml(point.time)}</span><h3>${escapeHtml(point.name)}</h3></div></div>
      ${point.reservationStamp ? `<div class="reservation-stamp" role="note"><span aria-hidden="true">!</span><b>${escapeHtml(point.reservationStamp)}</b></div>` : ""}
      <span class="recommendation-label ${recommendation.className} ${matchesPreference(point) ? "match" : ""}">${escapeHtml(recommendation.label)}${matchesPreference(point) ? " · pasuje do Ciebie" : ""}</span>
      ${disabled ? `<div class="mode-disabled-notice ${disabledMode}-notice" role="note"><span aria-hidden="true">${disabledCopy.icon}</span><div><b>${disabledCopy.title}</b><small>${disabledCopy.body}</small></div></div>` : ""}
      ${point.travelAlert ? `<div class="travel-alert" role="alert"><span class="travel-alert-date">${escapeHtml(point.travelAlert.until)}</span><b>${escapeHtml(point.travelAlert.title)}</b><p>${escapeHtml(point.travelAlert.body)}</p><a href="${point.travelAlert.url}" target="_blank" rel="noopener">Oficjalny komunikat RFI ↗</a></div>` : ""}
      <div class="status-row">${(point.statuses || []).map(status => `<span class="status">${escapeHtml(status)}</span>`).join("")}</div>
      <p class="point-desc">${escapeHtml(point.description)}</p>
      ${point.travelAlternative ? `<aside class="travel-alternative" aria-label="Alternatywny wariant podróży"><div class="travel-alternative-icon" aria-hidden="true">⚓</div><div><span>${escapeHtml(point.travelAlternative.label)}</span><b>${escapeHtml(point.travelAlternative.title)}</b><p>${escapeHtml(point.travelAlternative.body)}</p><small>${escapeHtml(point.travelAlternative.note)}</small><a href="${point.travelAlternative.url}" target="_blank" rel="noopener">Sprawdź aktualny rozkład Navigazione Laghi ↗</a></div></aside>` : ""}
      <div class="point-facts">
        <div><span>czas na miejscu</span><b>${shortened ? `około ${shortened} min · skrócone` : escapeHtml(point.visit)}</b></div><div><span>koszt</span><b>${escapeHtml(point.cost)}</b></div>
        <div><span>godziny</span><b>${escapeHtml(point.opening)}</b></div><div><span>rezerwacja</span><b>${escapeHtml(point.reservation)}</b></div>
      </div>
      <div class="why-box"><b>Dlaczego warto:</b> ${escapeHtml(point.why)}</div>
      <button class="place-button" data-action="open-place" data-id="${point.id}" aria-label="Odkryj ${escapeHtml(point.name)} i poznaj 5 ciekawostek"><span><b>Odkryj miejsce</b><small>opis · historia · 5 ciekawostek</small></span><span aria-hidden="true">↗</span></button>
      ${point.officialUrl ? `<a class="official-link" href="${point.officialUrl}" target="_blank" rel="noopener">Sprawdź dziś / bilety ↗</a>` : ""}
      ${point.audio?.url ? `<div class="audio-tip"><b>Martyna mówi · ${escapeHtml(point.audio.duration || "krótkie audio")}</b><audio controls preload="none" src="${point.audio.url}" aria-label="${escapeHtml(point.audio.title || `Audio o ${point.name}`)}"></audio></div>` : ""}
      ${point.photoSpot?.instruction ? `<div class="photo-spot"><b>Najlepszy kadr</b><p>${escapeHtml(point.photoSpot.instruction)}</p>${point.photoSpot.bestTime ? `<small>Wskazówka: ${escapeHtml(point.photoSpot.bestTime)}</small>` : ""}${disabled ? "" : `<a href="${point.photoSpot.mapsUrl || guideLink(point)}" target="_blank" rel="noopener">Otwórz punkt ↗</a>`}</div>` : ""}
      <div class="point-actions">
        ${disabled ? `<span class="navigate-button is-disabled" aria-disabled="true">Nawigacja wyłączona</span>` : `<a class="navigate-button" href="${guideLink(point)}" target="_blank" rel="noopener">Prowadź mnie</a>`}
        <button class="save-button ${saved ? "active" : ""}" data-action="toggle-save" data-id="${point.id}" aria-label="${saved ? "Usuń z zapisanych" : "Zapisz miejsce"}">${saved ? "♥" : "♡"}</button>
        <button class="done-button ${done ? "active" : ""}" data-action="toggle-done" data-id="${point.id}" aria-label="${disabled ? disabledCopy.title : done ? "Oznacz jako nieukończone" : "Oznacz jako ukończone"}" ${disabled ? "disabled" : ""}>${done ? "✓" : "○"}</button>
        <button class="location-button ${isCurrent ? "active" : ""}" data-action="set-current" data-id="${point.id}" ${disabled ? "disabled" : ""}>${isCurrent ? "Jesteś tutaj" : "Jestem tutaj"}</button>
      </div>
    </div>
    ${disabled ? `<div class="next-leg mode-skip ${disabledMode}-skip"><span>${disabledCopy.skip}</span><span aria-hidden="true">${disabledCopy.icon}</span></div>` : point.next && nextPoint ? `<div class="next-leg"><span>Dalej: <b>${escapeHtml(nextPoint.name)}</b></span><span>${modeIcon(point.next.mode)} ${point.next.minutes} min · ${escapeHtml(point.next.distance)}</span></div>` : ""}
  </article>`;
}

function renderPlace(point) {
  const detail = point.detail;
  if (!detail) return;
  const day = dayInfo(point.day);
  const placePoints = pointsForDay(point.day);
  const index = placePoints.findIndex(item => item.id === point.id);
  const previous = placePoints[index - 1] || null;
  const next = placePoints[index + 1] || null;
  const completed = placePoints.filter(item => state.done.includes(item.id)).length;
  const percent = placePoints.length ? Math.round(completed / placePoints.length * 100) : 0;
  const done = state.done.includes(point.id);
  const realImages = editorialImages(point);
  const images = realImages.length ? realImages : detail.images?.length ? detail.images : [{ src: pointImage(point) || day.hero, alt: point.name, position: point.position || "center" }];
  const hero = images[0];
  const quickInfo = [
    ["Ile czasu", detail.duration || point.visit],
    ["Koszt", detail.price || point.cost],
    ["Lokalizacja", detail.address || point.address],
    ["Czy warto", detail.worthIt],
    ["Wysiłek", detail.effort],
    ["Dzieci", detail.kids],
    ["Godziny", point.opening],
    ["Rezerwacja", point.reservation]
  ].filter(([, value]) => value);
  const descriptions = Array.isArray(detail.description) ? detail.description : [detail.description || point.description, point.why].filter(Boolean);
  const facts = detail.facts.slice(0, 5);
  const featuredFactIndex = detail.featuredFact ? facts.indexOf(detail.featuredFact) : -1;
  const featuredFact = featuredFactIndex >= 0 ? facts[featuredFactIndex] : null;
  const additionalFacts = featuredFact ? facts.filter((_, factIndex) => factIndex !== featuredFactIndex) : facts;
  const directNext = next && point.next?.to === next.id ? point.next : null;

  $("#placeContent").innerHTML = `<div class="place-shell" style="--place-accent:${day.accent}">
    <header class="place-topbar">
      <button class="place-back" data-action="close-place" aria-label="Wróć do planu dnia"><span aria-hidden="true">←</span><span>Dzień ${day.day} · ${escapeHtml(day.city)}</span></button>
      <button class="place-close" data-action="close-place" aria-label="Zamknij kartę miejsca">×</button>
    </header>

    <main class="place-main">
      <section class="place-hero">
        <button class="place-hero-image" data-action="open-image" data-src="${hero.src}" data-alt="${escapeHtml(hero.alt || point.name)}" aria-label="Powiększ zdjęcie: ${escapeHtml(point.name)}">
          <img ${responsiveImageAttributes(hero, "(max-width: 759px) 100vw, 44vw")} alt="${escapeHtml(hero.alt || point.name)}" style="object-position:${hero.position || "center"}" fetchpriority="high" decoding="async">
          <span class="place-zoom" aria-hidden="true">Powiększ</span>
          ${realImages.length ? `<span class="place-photo-source">zdjęcie Martyny z trasy</span>` : ""}
        </button>
        <div class="place-route-mark" aria-hidden="true"><b>${String(index + 1).padStart(2, "0")}</b><span>/ ${String(placePoints.length).padStart(2, "0")}</span></div>
      </section>

      <div class="place-copy">
        <div class="place-heading">
          ${detail.tag ? `<span class="place-tag">${escapeHtml(detail.tag)}</span>` : ""}
          <p class="place-location">${escapeHtml(day.city)} · punkt ${point.order} na trasie</p>
          <h1 id="placeTitle">${escapeHtml(point.name)}</h1>
          ${point.reservationStamp ? `<div class="reservation-stamp" role="note"><span aria-hidden="true">!</span><b>${escapeHtml(point.reservationStamp)}</b></div>` : ""}
        </div>

        <section class="place-progress" aria-label="Postęp punktów dnia">
          <div><span>Postęp dnia</span><b>${completed} / ${placePoints.length} punktów</b></div>
          <div class="progress-line" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}" aria-valuetext="Odwiedzono ${completed} z ${placePoints.length} punktów"><i style="width:${percent}%"></i></div>
        </section>

        ${percent === 100 ? `<section class="place-day-complete" role="status"><span>Dzień ${day.day}</span><h2>${escapeHtml(day.city)} zaliczone</h2><p>${completed} z ${placePoints.length} punktów oznaczonych jako odwiedzone.</p></section>` : ""}

        <section class="place-description" aria-label="O miejscu">
          ${descriptions.map(paragraph => `<p>${escapeHtml(paragraph)}</p>`).join("")}
        </section>

        ${detail.notice ? `<aside class="place-data-notice" role="note"><span>Informacja czasowa</span><p>${escapeHtml(detail.notice)}</p></aside>` : ""}

        <section class="place-section curiosity-section" aria-labelledby="curiosityTitle"><div class="place-section-heading"><span>Warto wiedzieć</span><h2 id="curiosityTitle">5 ciekawostek</h2></div>${featuredFact ? `<div class="featured-curiosity"><span>Wow, tego możesz nie wiedzieć</span><p>${escapeHtml(featuredFact)}</p></div><details class="additional-curiosities" open><summary><span>Czy wiesz, że?</span><small>${additionalFacts.length} dodatkowe fakty</small></summary><ol>${additionalFacts.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol></details>` : `<ol>${facts.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`}</section>

        ${quickInfo.length ? `<section class="place-section" aria-labelledby="quickInfoTitle"><div class="place-section-heading"><span>Na miejscu</span><h2 id="quickInfoTitle">Najważniejsze informacje</h2></div><dl class="quick-info">${quickInfo.map(([label, value]) => `<div><dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value)}</dd></div>`).join("")}</dl></section>` : ""}

        ${detail.tip ? `<aside class="martyna-place-tip"><div><img src="assets/logo-martyna.webp" alt="" aria-hidden="true"><span>Tip Martyny</span></div><blockquote>${escapeHtml(detail.tip)}</blockquote></aside>` : ""}

        ${detail.photoTip ? `<section class="place-note"><span>Zdjęcie zrób tutaj</span><h2>Najlepszy kadr</h2><p>${escapeHtml(detail.photoTip)}</p></section>` : ""}

        ${detail.shortVisit ? `<section class="place-note short-visit"><span>Gdy masz mało czasu</span><h2>Zobacz sedno</h2><p>${escapeHtml(detail.shortVisit)}</p></section>` : ""}

        ${detail.highlights?.length ? `<section class="place-section highlights-section"><div class="place-section-heading"><span>Krótka lista</span><h2>Nie przegap</h2></div><ol>${detail.highlights.slice(0, 5).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ol></section>` : ""}

        ${detail.sources?.length ? `<section class="place-section place-sources" aria-labelledby="placeSourcesTitle"><div class="place-section-heading"><span>Sprawdzone informacje</span><h2 id="placeSourcesTitle">Źródła</h2></div><ul>${detail.sources.map(source => `<li><a href="${source.url}" target="_blank" rel="noopener">${escapeHtml(source.label)} ↗</a></li>`).join("")}</ul></section>` : ""}

        ${images.length > 1 ? `<section class="place-section gallery-section" aria-labelledby="galleryTitle"><div class="place-section-heading"><span>${images.length} zdjęcia</span><h2 id="galleryTitle">Galeria z trasy</h2></div><div class="place-gallery">${images.map((image, imageIndex) => `<button data-action="open-image" data-src="${image.src}" data-alt="${escapeHtml(image.alt || `${point.name}, zdjęcie ${imageIndex + 1}`)}"><img ${responsiveImageAttributes(image, "(max-width: 759px) 86vw, 430px")} alt="${escapeHtml(image.alt || `${point.name}, zdjęcie ${imageIndex + 1}`)}" style="object-position:${image.position || "center"}" loading="lazy" decoding="async"></button>`).join("")}</div></section>` : ""}

        <nav class="place-sequence" aria-label="Poprzednie i następne ważne miejsce">
          ${previous ? `<button data-action="place-nav" data-id="${previous.id}"><span>← Poprzednie</span><b>${escapeHtml(previous.name)}</b></button>` : `<span></span>`}
          ${next ? `<button class="next" data-action="place-nav" data-id="${next.id}"><span>Następne →</span><b>${escapeHtml(next.name)}</b>${directNext ? `<small>${directNext.minutes} min · ${escapeHtml(directNext.distance)}</small>` : ""}</button>` : `<span></span>`}
        </nav>
      </div>
    </main>

    <div class="place-actions-bar">
      <a href="${guideLink(point)}" target="_blank" rel="noopener"><span aria-hidden="true">→</span>Prowadź mnie</a>
      <button class="${done ? "active" : ""}" data-action="toggle-done" data-id="${point.id}"><span aria-hidden="true">${done ? "✓" : "○"}</span>${done ? "Byłam tutaj" : "Byłam tutaj"}</button>
    </div>
  </div>`;
}

function setPlaceUrl(id, mode = "replace") {
  const url = new URL(location.href);
  url.searchParams.set("place", id);
  history[mode === "push" ? "pushState" : "replaceState"]({ place: id }, "", url);
}

function togglePageInert(inert) {
  [$(".topbar"), $("#main"), $(".bottom-nav"), $("#companionDock")].filter(Boolean).forEach(element => {
    element.inert = inert;
    if (inert) element.setAttribute("aria-hidden", "true");
    else element.removeAttribute("aria-hidden");
  });
}

function openPlace(id, { historyMode = "push" } = {}) {
  const point = data.points.find(item => item.id === id && item.detail);
  if (!point) return;
  const overlay = $("#placeOverlay");
  if (overlay.hidden) {
    placeReturnScroll = window.scrollY;
    placeTrigger = document.activeElement;
  }
  state.day = point.day;
  saveState();
  renderPlace(point);
  overlay.hidden = false;
  document.body.classList.add("place-open");
  togglePageInert(true);
  overlay.scrollTop = 0;
  if (historyMode === "push") {
    placeHistoryOwned = true;
    setPlaceUrl(id, "push");
  } else if (historyMode === "replace") setPlaceUrl(id, "replace");
  requestAnimationFrame(() => $("#placeDialog").focus());
}

function hidePlace({ restoreScroll = true } = {}) {
  if ($("#placeOverlay").hidden) return;
  $("#imageLightbox").hidden = true;
  $("#placeOverlay").hidden = true;
  document.body.classList.remove("place-open");
  togglePageInert(false);
  if (restoreScroll) window.scrollTo({ top: placeReturnScroll, behavior: "auto" });
  if (placeTrigger?.isConnected) placeTrigger.focus({ preventScroll: true });
  placeTrigger = null;
}

function closePlace() {
  if (placeHistoryOwned && new URL(location.href).searchParams.has("place")) {
    placeHistoryOwned = false;
    history.back();
    return;
  }
  const url = new URL(location.href);
  url.searchParams.delete("place");
  history.replaceState({}, "", url);
  hidePlace();
}

function openImage(button) {
  const image = $("#lightboxImage");
  image.src = button.dataset.src;
  image.alt = button.dataset.alt || "";
  $("#imageLightbox").hidden = false;
  $(".image-lightbox-close").focus();
}

function closeImage() {
  $("#imageLightbox").hidden = true;
  $("#lightboxImage").src = "";
  $("#placeDialog").focus();
}

function modeIcon(mode) {
  return ({walking:"pieszo", transit:"transport", ferry:"prom", train:"pociąg", bus:"autobus", "bus+train":"autobus zastępczy + pociąg"})[mode] || mode;
}

function renderRoutes() {
  const routes = data.routes.filter(route => route.day === state.day);
  const limited = state.routeMode === "rain" || state.routeMode === "quick" || energyMode() !== "full" || Boolean(state.delayPlans[state.day]);
  const icon = state.routeMode === "rain" ? "☂" : "◷";
  const modeLabel = state.routeMode === "rain" ? "trybie deszczowym" : "zmienionym planie";
  $("#routeCards").innerHTML = routes.map(route => `<article class="route-card ${limited ? "mode-disabled" : ""}" ${limited ? `aria-disabled="true"` : ""}><div><h3>${escapeHtml(route.label)}</h3><p>${modeIcon(route.mode)} · ${route.minutes} min · ${escapeHtml(route.distance)}</p>${limited ? `<span class="route-disabled-label">${icon} Pełna trasa wyłączona — prowadź tylko z aktywnych kart powyżej</span>` : `<a class="route-primary-map" href="${route.googleMapsUrl}" target="_blank" rel="noopener">Otwórz w Google Maps →</a>`}</div>${limited ? `<div class="qr-disabled" aria-label="Kod QR wyłączony w ${modeLabel}"><span>${icon}</span><small>QR wyłączony</small></div>` : `<div><img src="qr/${route.id}.svg" alt="Kod QR do trasy ${escapeHtml(route.label)}" loading="lazy"><small class="route-qr-help">Na komputerze lub tablecie? Zeskanuj QR telefonem.</small></div>`}</article>`).join("");
}

function clearRealMap() {
  if (leafletAnimationFrame) cancelAnimationFrame(leafletAnimationFrame);
  leafletAnimationFrame = 0;
  if (leafletMapInstance) leafletMapInstance.remove();
  leafletMapInstance = null;
}

function initializeRealMap(points, disabledIds, palette) {
  const L = window.L;
  const container = $("#leafletMap");
  const canvas = container?.closest(".journey-canvas");
  if (!L || !container || !canvas || !points.length) return;
  const coordinates = points.map(point => [point.lat, point.lng]);
  const map = L.map(container, { zoomControl: true, attributionControl: true, preferCanvas: true, zoomSnap: .5 });
  leafletMapInstance = map;
  const tiles = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    updateWhenIdle: true,
    keepBuffer: 2,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
  }).addTo(map);
  tiles.once("load", () => canvas.classList.add("real-map-ready"));

  L.polyline(coordinates, { color: "#fffdf8", weight: 11, opacity: .82, lineCap: "round", lineJoin: "round", interactive: false }).addTo(map);
  L.polyline(coordinates, { color: palette.accent, weight: 4, opacity: .94, dashArray: "7 11", lineCap: "round", lineJoin: "round", className: "real-route-line", interactive: false }).addTo(map);

  points.forEach((point, index) => {
    const disabled = disabledIds.has(point.id);
    const current = state.currentPoint[state.day] === point.id;
    const done = state.done.includes(point.id);
    const icon = L.divIcon({
      className: "real-map-pin-wrap",
      html: `<span class="real-map-pin ${disabled ? "is-disabled" : ""} ${current ? "is-current" : ""} ${done ? "is-done" : ""}" style="--pin-accent:${palette.accent}"><i>${index+1}</i></span>`,
      iconSize: [40,40], iconAnchor: [20,20], popupAnchor: [0,-20]
    });
    const marker = L.marker([point.lat, point.lng], { icon, keyboard: true, title: point.name, alt: point.name });
    marker.on("add", () => {
      const element = marker.getElement();
      if (!element) return;
      element.setAttribute("aria-label", disabled ? `${point.name} — punkt poza aktywnym planem` : `Punkt ${index+1}: ${point.name}. Otwórz szczegóły`);
      element.addEventListener("click", () => marker.openPopup());
      element.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") marker.openPopup();
      });
    });
    marker.addTo(map);
    const popup = `<div class="real-map-popup"><span>${escapeHtml(point.time)} · ${escapeHtml(point.type === "transport" ? "przejazd" : point.type === "food" ? "smak" : "przystanek")}</span><b>${escapeHtml(point.name)}</b>${disabled ? `<small>Punkt poza aktywnym planem</small>` : `<a href="${guideLink(point)}" target="_blank" rel="noopener">Prowadź mnie →</a>`}</div>`;
    marker.bindPopup(popup, { closeButton: true, maxWidth: 250 });
    marker.on("click", () => marker.openPopup());
    marker.bindTooltip(`${index+1}. ${escapeHtml(point.name)}`, { direction: "top", offset: [0,-18], opacity: .96 });
  });

  const bounds = L.latLngBounds(coordinates);
  map.fitBounds(bounds.pad(.12), { padding: [34,34], maxZoom: 15 });
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scooter = L.marker(coordinates[0], {
    interactive: false,
    keyboard: false,
    zIndexOffset: 1000,
    icon: L.divIcon({ className: "real-map-scooter-wrap", html: '<span class="real-map-scooter">🛵</span>', iconSize: [42,42], iconAnchor: [21,21] })
  });
  scooter.on("add", () => scooter.getElement()?.setAttribute("aria-hidden", "true"));
  scooter.addTo(map);
  if (!reducedMotion && coordinates.length > 1) {
    const started = performance.now();
    const duration = Math.max(45000, (coordinates.length-1)*10000);
    const animate = now => {
      if (leafletMapInstance !== map) return;
      const elapsed = Math.max(0, now-started);
      const progress = (elapsed%duration)/duration*(coordinates.length-1);
      const index = Math.max(0, Math.min(coordinates.length-2, Math.floor(progress)));
      const phase = progress-index;
      const [latA,lngA] = coordinates[index], [latB,lngB] = coordinates[index+1];
      scooter.setLatLng([latA+(latB-latA)*phase, lngA+(lngB-lngA)*phase]);
      leafletAnimationFrame = requestAnimationFrame(animate);
    };
    leafletAnimationFrame = requestAnimationFrame(animate);
  }
  requestAnimationFrame(() => map.invalidateSize());
}

function renderMap() {
  clearRealMap();
  renderDayTabs("mapDayTabs");
  const points = pointsForDay();
  if (!points.length) return;
  const disabledIds = new Set(points.filter(point => disabledModeFor(point)).map(point => point.id));
  const disabledReason = state.routeMode === "rain" ? "wyłączone przez deszcz" : state.routeMode === "quick" ? "pomijane w skróconej trasie" : state.delayPlans[state.day] ? "pomijane po opóźnieniu" : "pomijane w spokojniejszym tempie";
  const lngs = points.map(point => point.lng);
  const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
  const width = 420, height = Math.max(580, points.length * 61 + 145);
  const rangeLng = maxLng - minLng || 1;
  const pathPattern = [132, 278, 174, 300, 142, 264, 184, 306, 156, 270, 190];
  const xy = (point, index) => {
    const geographicNudge = ((point.lng-minLng)/rangeLng-.5)*22;
    return [Math.max(104, Math.min(316, pathPattern[index % pathPattern.length] + geographicNudge)), 102 + index*61];
  };
  const coordinates = points.map(xy);
  const path = coordinates.reduce((route, [x,y], index) => {
    if (!index) return `M${x.toFixed(1)},${y.toFixed(1)}`;
    const [previousX, previousY] = coordinates[index-1];
    const middleY = (previousY+y)/2;
    return `${route} C${previousX.toFixed(1)},${middleY.toFixed(1)} ${x.toFixed(1)},${middleY.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
  }, "");
  const palettes = {
    1: { accent: "#b85f4b", accentSoft: "#f1c8b8", water: "#c9e1de", sun: "#e9b84f" },
    2: { accent: "#4f8791", accentSoft: "#b9d9da", water: "#9ecbd2", sun: "#e8b44d" },
    3: { accent: "#b56a4f", accentSoft: "#e8c2a6", water: "#c6ddda", sun: "#dba63f" },
    4: { accent: "#748267", accentSoft: "#cbd3bc", water: "#bfd8d5", sun: "#e0ad48" }
  };
  const palette = palettes[state.day] || palettes[1];
  const typeLabel = { transport: "przejazd", attraction: "zabytek", food: "smak", photospot: "widok" };
  const completed = points.filter(point => state.done.includes(point.id)).length;
  const modeLabel = state.routeMode === "rain" ? "Plan na deszcz" : state.routeMode === "quick" ? "Krótka trasa" : "Pełna trasa";
  const nodes = points.map((point,index) => {
    const [x,y] = coordinates[index];
    const anchor = x > width/2 ? "end" : "start";
    const labelX = x + (anchor === "end" ? -25 : 25);
    const safeName = point.name.length > 29 ? `${point.name.slice(0,27)}…` : point.name;
    const disabled = disabledIds.has(point.id);
    const current = state.currentPoint[state.day] === point.id;
    const done = state.done.includes(point.id);
    const detail = disabled ? "pominięte" : `${point.time} · ${typeLabel[point.type] || "przystanek"}`;
    const node = `<g class="map-stop ${disabled ? "map-node-disabled" : ""} ${current ? "map-node-current" : ""} ${done ? "map-node-completed" : ""}" style="--stop-index:${index}">
      <circle class="stop-halo" cx="${x}" cy="${y}" r="24"/>
      <circle class="stop-dot" cx="${x}" cy="${y}" r="16"/>
      <text x="${x}" y="${y+4}" text-anchor="middle" class="map-number">${index+1}</text>
      <text x="${labelX}" y="${y-2}" text-anchor="${anchor}" class="map-label"><tspan>${escapeHtml(safeName)}</tspan><tspan x="${labelX}" dy="15" class="map-time">${escapeHtml(detail)}</tspan></text>
    </g>`;
    return disabled ? `<g aria-label="${escapeHtml(point.name)} — ${disabledReason}" aria-disabled="true">${node}</g>` : `<a href="${guideLink(point)}" target="_blank" rel="noopener" aria-label="Prowadź do ${escapeHtml(point.name)}">${node}</a>`;
  }).join("");
  $("#svgMap").innerHTML = `<article class="journey-postcard" style="--map-accent:${palette.accent};--map-accent-soft:${palette.accentSoft};--map-water:${palette.water};--map-sun:${palette.sun}">
    <header class="journey-postcard-head">
      <div class="journey-title"><span class="italy-flag" aria-hidden="true"><i></i><i></i><i></i></span><div><span class="journey-kicker">Il nostro giro · dzień ${state.day}</span><h2>${escapeHtml(dayInfo().city)}</h2></div></div>
      <div class="journey-score"><strong>${completed}/${points.length}</strong><span>odwiedzone</span></div>
    </header>
    <div class="journey-canvas">
      <div id="leafletMap" class="leaflet-real-map" role="region" aria-label="Interaktywna mapa rzeczywistych dróg i miejsc na trasie"></div>
      <span class="italian-postmark" aria-hidden="true">LOMBARDIA<b>BUON VIAGGIO</b></span>
      <svg class="journey-fallback-map" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="mapTitle mapDesc"><title id="mapTitle">Ilustrowana trasa: ${escapeHtml(dayInfo().city)}</title><desc id="mapDesc">Awaryjny schemat trasy wyświetlany, gdy realne tło mapowe nie jest dostępne.</desc>
        <path class="journey-route-shadow" d="${path}"/>
        <path class="journey-route" d="${path}"/>
        ${nodes}
        <g class="journey-traveller" aria-hidden="true"><circle r="18"/><text x="0" y="7" text-anchor="middle">🛵</text><animateMotion dur="${Math.max(45,(points.length-1)*10)}s" begin=".8s" repeatCount="indefinite" path="${path}"/></g>
      </svg>
    </div>
    <footer class="journey-postcard-foot"><span><i class="route-swatch"></i>${escapeHtml(modeLabel)}</span><span>Mapa OpenStreetMap · trasa orientacyjna</span></footer>
  </article>`;
  initializeRealMap(points, disabledIds, palette);
  $("#mapLegend").textContent = state.routeMode === "rain" ? "Tło pokazuje realny układ mapy. Szare punkty są wyłączone przez deszcz i nie uruchamiają nawigacji." : state.routeMode === "quick" ? "Tło pokazuje realny układ mapy. Szare punkty nie mieszczą się w skróconej trasie i nie uruchamiają nawigacji." : "Tło i położenie punktów pochodzą z mapy. Łącząca je linia jest orientacyjna — dokładną trasę otwórz po dotknięciu przystanku.";
  const select = $("#currentPointSelect");
  select.innerHTML = `<option value="">Wybierz, gdzie jesteś</option>${points.map(point => `<option value="${point.id}" ${state.currentPoint[state.day] === point.id ? "selected" : ""} ${disabledIds.has(point.id) ? "disabled" : ""}>${point.order}. ${escapeHtml(point.name)}${disabledIds.has(point.id) ? ` — ${disabledReason}` : ""}</option>`).join("")}`;
  renderNextThree();
}

function renderNextThree() {
  const position = logicalPosition();
  const points = position.points;
  const nextIndex = position.next ? points.indexOf(position.next) : points.length;
  const upcoming = points.slice(nextIndex, nextIndex + 3);
  const remaining = points.slice(nextIndex);
  const distance = remaining.reduce((total, point, index) => {
    const prev = index === 0 ? position.current : remaining[index - 1];
    return total + haversine(prev, point);
  }, 0);
  $("#nextThree").innerHTML = `<p class="tiny-note">Zostało ${remaining.length} punktów · około ${distance.toFixed(1).replace(".",",")} km według linii trasy</p>${upcoming.map(point => `<div class="next-item"><span class="no">${point.order}</span><b>${escapeHtml(point.name)}</b><a href="${guideLink(point)}" target="_blank" rel="noopener">prowadź</a></div>`).join("") || `<div class="empty-state">To ostatni punkt dnia — dobra robota.</div>`}`;
}

function haversine(a,b) {
  if (!a || !b) return 0;
  const rad = value => value * Math.PI / 180;
  const dLat = rad(b.lat-a.lat), dLng = rad(b.lng-a.lng);
  const q = Math.sin(dLat/2)**2 + Math.cos(rad(a.lat))*Math.cos(rad(b.lat))*Math.sin(dLng/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(q), Math.sqrt(1-q));
}

function renderFood() {
  renderDayTabs("foodDayTabs");
  const onlyVeg = $("#vegToggle").checked;
  const dishes = data.food.filter(item => item.day === state.day && (!onlyVeg || item.veg));
  const restaurants = data.restaurants.filter(item => item.day === state.day && (!onlyVeg || item.tags.includes("WEGE")));
  $("#dishGrid").innerHTML = dishes.map(item => `<article class="dish-card"><span class="kicker">Dzień ${item.day}</span><h3>${escapeHtml(item.dish)}</h3><p>${escapeHtml(item.description)}</p>${item.veg ? `<span class="veg-label">OPCJA WEGE</span>` : ""}</article>`).join("") || empty("Brak dań w tym filtrze.");
  $("#restaurantGrid").innerHTML = restaurants.map(item => `<article class="restaurant-card" data-near="${item.near}"><span class="tags">${item.tags.map(escapeHtml).join(" · ")} · ${item.price}</span><h3>${escapeHtml(item.name)}</h3><p><b>Zamów:</b> ${escapeHtml(item.order)}</p><p>${escapeHtml(item.reason)}</p>${item.hours ? `<p><b>Godziny:</b> ${escapeHtml(item.hours)}</p>` : ""}<a href="${mapLink(item.mapsQuery)}" target="_blank" rel="noopener">${escapeHtml(item.address)} ↗</a>${item.officialUrl ? `<a href="${item.officialUrl}" target="_blank" rel="noopener">Aktualne menu / godziny ↗</a>` : ""}</article>`).join("") || empty("Brak lokali w tym filtrze.");
}

function transportSteps(item) {
  const stops = String(item.route || "").split("→").map(value => value.trim()).filter(Boolean);
  if (item.id === "varenna-works") {
    return [
      "Podejdź na Bergamo Autostazione i znajdź stanowisko 10.",
      "Wsiądź do autobusu zastępczego wskazanego dla biletu do Varenna-Esino.",
      "Zależnie od rozkładu przesiądź się w Ponte San Pietro albo jedź autobusem do Calolziocorte.",
      "Kontynuuj pociągiem do Lecco, a tam wybierz pociąg w kierunku Colico, Sondrio lub Tirano.",
      "Wysiądź na Varenna-Esino. Jeden zakup relacji może obejmować cały łańcuch, ale sprawdź go ponownie dzień wcześniej i rano."
    ];
  }
  if (stops.length > 1) return stops.map((stop, index) => index === 0 ? `Start: ${stop}` : index === stops.length - 1 ? `Wysiądź / zakończ: ${stop}` : `Następny etap: ${stop}`);
  return [item.route];
}

function renderOfflineSection() {
  const ready = Boolean(state.offlinePreparedAt);
  $("#offlineSection").innerHTML = `<span class="kicker">Przed wyjściem</span><h2>Przygotuj przewodnik offline</h2><p>${ready ? `Przewodnik zapisano na tym urządzeniu ${new Date(state.offlinePreparedAt).toLocaleString("pl-PL", {dateStyle:"short", timeStyle:"short"})}.` : "Zapiszę tekst, adresy, frazy, trasę i Twoje postępy w pamięci przeglądarki."}</p><div class="offline-checklist"><span>plan wszystkich 4 dni i adresy</span><span>frazy oraz instrukcje awaryjne</span><span>Twoje zapisane miejsca i postęp</span><span>zdjęcia dostępne po pierwszym pełnym wczytaniu</span></div><p class="transport-warning"><b>Google Maps i bieżące rozkłady są osobne.</b> Mapę offline pobierz wcześniej bezpośrednio w aplikacji Google Maps; przewodnik nie może tego zrobić za Ciebie.</p><button class="sheet-cta" data-action="offline-prepare">${ready ? "Odśwież dane offline" : "Przygotuj teraz"}</button>`;
}

async function prepareOffline() {
  const button = $('[data-action="offline-prepare"]');
  if (button) { button.disabled = true; button.textContent = "Przygotowuję…"; }
  try {
    const urls = ["./", "index.html", "styles.css?v=41", "app.js?v=41", "manifest.webmanifest", ...DATA_FILES.map(name => `data/${name}.json`)];
    await Promise.all(urls.map(url => fetch(url, {cache:"reload"}).then(response => { if (!response.ok) throw new Error(url); })));
    if ("serviceWorker" in navigator) await navigator.serviceWorker.ready;
    state.offlinePreparedAt = new Date().toISOString();
    saveState();
    renderOfflineSection();
    toast("Przewodnik jest przygotowany offline");
  } catch (_) {
    toast("Nie udało się pobrać wszystkiego — sprawdź internet");
    if (button) { button.disabled = false; button.textContent = "Spróbuj ponownie"; }
  }
}

function renderTips() {
  $("#tipGrid").innerHTML = data.tips.map((tip,index) => `<article class="tip-card"><span class="kicker">0${index+1}</span><h3>${escapeHtml(tip.title)}</h3><p>${escapeHtml(tip.body)}</p></article>`).join("");
  $("#transportGrid").innerHTML = data.transport.map(item => `<article class="transport-card"><span class="kicker">Dzień ${item.day}</span><h3>${escapeHtml(item.title)}</h3>${item.alert ? `<span class="transport-alert">${escapeHtml(item.alert)}</span>` : ""}<p class="route">${escapeHtml(item.route)}</p><span class="price">${escapeHtml(item.price)}</span><ol class="transport-steps">${transportSteps(item).map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol>${item.alert ? `<p class="transport-warning"><b>To planowane utrudnienie, nie dane na żywo.</b> Termin może się zmienić. Potwierdź połączenie dzień wcześniej i rano.</p>` : ""}<p>${escapeHtml(item.note)}</p><a class="route-primary-map" href="${item.url}" target="_blank" rel="noopener">Sprawdź aktualne połączenie ↗</a><p class="tiny-note">Po przyjeździe wróć do zakładki Plan i wybierz „Co mam zrobić teraz?”.</p></article>`).join("");
  renderBudget();
  $("#glossaryGrid").innerHTML = data.glossary.map(item => `<div class="phrase"><b lang="it">${escapeHtml(item.it)}</b><span>${escapeHtml(item.pl)}</span></div>`).join("");
  $("#sourceList").innerHTML = `<p><b>Źródła i aktualność:</b> ${escapeHtml(data.sources.notice)} Aktualizacja ${formatDate(data.sources.updated)}.</p>${data.sources.links.map(link => `<a href="${link.url}" target="_blank" rel="noopener">${escapeHtml(link.label)} ↗</a>`).join("")}`;
  renderOfflineSection();
}

function renderBudget() {
  $("#budgetDays").innerHTML = data.budget.map(day => `<div class="budget-day"><h3>Dzień ${day.day}</h3>${day.items.map(item => {
    const checked = state.budget[item.id] ?? item.default;
    return `<div class="budget-item"><input type="checkbox" id="budget-${item.id}" data-action="budget" data-id="${item.id}" data-group="${item.group || ""}" ${checked ? "checked" : ""}><label for="budget-${item.id}">${escapeHtml(item.label)}</label><span>${formatRange(item.min,item.max)}</span></div>`;
  }).join("")}</div>`).join("");
  updateBudgetTotal();
}

function updateBudgetTotal() {
  let min = 0, max = 0;
  data.budget.flatMap(day => day.items).forEach(item => {
    const checkbox = $(`#budget-${item.id}`);
    if (checkbox?.checked) { min += item.min; max += item.max; }
  });
  $("#budgetTotal").textContent = formatRange(min,max);
}

function formatRange(min,max) {
  const f = number => number.toFixed(number % 1 ? 2 : 0).replace(".",",");
  return min === max ? `${f(min)} €` : `${f(min)}–${f(max)} €`;
}

function renderPassport() {
  $("#tripPassport").innerHTML = data.destinations.map(day => {
    const points = pointsForDay(day.day);
    const completed = points.filter(point => state.done.includes(point.id)).length;
    const percent = points.length ? Math.round(completed / points.length * 100) : 0;
    const favorite = points.find(point => state.saved.includes(point.id));
    return `<article class="passport-day"><div><span class="kicker">Dzień ${day.day}</span><strong>${escapeHtml(day.city)}</strong><small>${favorite ? `Zapamiętaj: ${escapeHtml(favorite.name)}` : "Zapisz sercem miejsce, które chcesz zapamiętać"}</small></div><div><strong>${percent}%</strong><small>${completed}/${points.length}</small></div></article>`;
  }).join("");
}

function renderPreferences() {
  const groups = [
    ["pace", "Tempo", [["intensive", "Intensywnie"], ["normal", "Normalnie"], ["calm", "Spokojnie"]]],
    ["interests", "Co lubisz", [["zabytki", "Zabytki"], ["jedzenie", "Jedzenie"], ["widoki", "Widoki"], ["zdjęcia", "Zdjęcia"], ["klimat", "Klimat miasta"]]],
    ["budget", "Budżet", [["saving", "Oszczędnie"], ["normal", "Normalnie"], ["flexible", "Komfortowo"]]]
  ];
  $("#preferencesPanel").innerHTML = `${groups.map(([group, title, options]) => `<div class="preference-group"><b>${title}</b><div class="preference-options">${options.map(([value, label]) => {
    const active = group === "interests" ? state.preferences.interests.includes(value) : state.preferences[group] === value;
    return `<button class="${active ? "active" : ""}" data-action="set-preference" data-group="${group}" data-value="${value}" aria-pressed="${active}">${label}</button>`;
  }).join("")}</div></div>`).join("")}<p class="tiny-note">Preferencje podkreślają pasujące miejsca. Nie zmieniają same planu bez Twojej decyzji.</p>`;
}

function renderSaved() {
  const total = data.points.length;
  const count = state.done.length;
  $("#overallProgress").innerHTML = `<strong>${Math.round(count/total*100)}%</strong><span>${count} z ${total} punktów ukończonych</span><div class="progress-line"><i style="width:${count/total*100}%"></i></div>`;
  const points = data.points.filter(point => state.saved.includes(point.id));
  $("#savedGrid").innerHTML = points.length ? points.map(point => `<article class="saved-card"><div><span class="kicker">Dzień ${point.day}</span><h3>${escapeHtml(point.name)}</h3><p>${escapeHtml(point.address)}</p><a class="official-link" href="${guideLink(point)}" target="_blank" rel="noopener">Prowadź mnie ↗</a></div><button data-action="toggle-save" data-id="${point.id}" aria-label="Usuń ${escapeHtml(point.name)}">♥</button></article>`).join("") : empty("Jeszcze nic tu nie ma. Dotknij serca przy wybranym miejscu.");
  renderPassport();
  renderPreferences();
}

function empty(message) { return `<div class="empty-state">${escapeHtml(message)}</div>`; }
function formatDate(value) { const [y,m,d] = value.split("-"); return `${d}.${m}.${y}`; }

function showView(name) {
  state.view = name;
  const viewMap = {home:"homeView", day:"dayView", map:"mapView", food:"foodView", tips:"tipsView", saved:"savedView"};
  Object.entries(viewMap).forEach(([key,id]) => $(`#${id}`).hidden = key !== name);
  $$(".nav-item").forEach(item => item.classList.toggle("active", item.dataset.view === name || (name === "home" && item.dataset.view === "day")));
  if (name === "day") renderDay();
  if (name === "map") renderMap();
  if (name === "food") renderFood();
  if (name === "tips") renderTips();
  if (name === "saved") renderSaved();
  const companionVisible = name !== "home" && name !== "saved";
  $("#companionDock").hidden = !companionVisible;
  document.body.classList.toggle("companion-active", companionVisible);
  window.scrollTo({top: 0, behavior: "smooth"});
}

function switchDay(day) {
  state.day = Number(day);
  state.routeMode = "full";
  saveState();
  if (state.view === "map") renderMap();
  else if (state.view === "food") renderFood();
  else { state.view = "day"; showView("day"); }
}

document.addEventListener("click", event => {
  const button = event.target.closest("[data-action], [data-view]");
  if (!button) {
    const card = event.target.closest(".point-card[data-place-id]");
    if (card && !event.target.closest("a, button, input, select, textarea, audio")) openPlace(card.dataset.placeId);
    return;
  }
  if (button.dataset.view) return showView(button.dataset.view);
  const action = button.dataset.action;
  if (action === "open-place") openPlace(button.dataset.id);
  if (action === "close-place") closePlace();
  if (action === "place-nav") openPlace(button.dataset.id, { historyMode: "replace" });
  if (action === "open-image") openImage(button);
  if (action === "close-image") closeImage();
  if (action === "home") showView("home");
  if (action === "open-day" || action === "switch-day") switchDay(button.dataset.day);
  if (action === "print") window.print();
  if (action === "sheet-close") sheetClose();
  if (action === "whats-now") renderWhatsNowSheet();
  if (action === "delay-open") renderDelaySheet();
  if (action === "delay-preview") renderDelaySheet(createDelayPlan(button.dataset.minutes));
  if (action === "delay-apply") {
    state.delayPlans[state.day] = createDelayPlan(button.dataset.minutes);
    saveState(); sheetClose(); renderDay(); toast("Plan przeliczony po opóźnieniu");
  }
  if (action === "delay-clear") {
    delete state.delayPlans[state.day];
    state.routeMode = "full";
    state.energyByDay[state.day] = "full";
    saveState(); sheetClose(); renderDay(); toast("Przywrócono plan bez opóźnienia");
  }
  if (action === "sos-open") renderSosSheet();
  if (action === "sos-detail") renderSosDetail(button.dataset.kind);
  if (action === "set-route-mode") {
    state.routeMode = button.dataset.modeValue;
    saveState(); sheetClose(); renderDay(); toast("Włączono plan na deszcz");
  }
  if (action === "open-food") { sheetClose(); showView("food"); }
  if (action === "offline-prepare") prepareOffline();
  if (action === "scroll-plan") $("#dayTabs").scrollIntoView({behavior:"smooth", block:"start"});
  if (action === "set-energy") {
    state.energyByDay[state.day] = button.dataset.energy;
    saveState(); renderDay(); toast("Tempo planu zostało dopasowane");
  }
  if (action === "set-preference") {
    const {group, value} = button.dataset;
    if (group === "interests") state.preferences.interests = state.preferences.interests.includes(value) ? state.preferences.interests.filter(item => item !== value) : [...state.preferences.interests, value];
    else state.preferences[group] = value;
    if (group === "pace") state.energyByDay[state.day] = ({intensive:"full", normal:"normal", calm:"calm"})[value];
    saveState(); renderPreferences(); toast("Preferencje zapisane");
  }
  if (action === "set-current") {
    const point = data.points.find(item => item.id === button.dataset.id);
    if (point) {
      state.day = point.day;
      state.currentPoint[point.day] = point.id;
      saveState(); sheetClose();
      if (state.view === "map") renderMap();
      else if (state.view === "day") renderDay();
      else { state.view = "day"; showView("day"); }
      requestAnimationFrame(() => $(`#point-${point.id}`)?.scrollIntoView({behavior:"smooth", block:"center"}));
      toast(`Zapisano: ${point.name}`);
    }
  }
  if (action === "toggle-save") {
    const id = button.dataset.id;
    state.saved = state.saved.includes(id) ? state.saved.filter(item => item !== id) : [...state.saved,id];
    saveState();
    toast(state.saved.includes(id) ? "Dodano do zapisanych" : "Usunięto z zapisanych");
    state.view === "saved" ? renderSaved() : renderDay();
  }
  if (action === "toggle-done") {
    const id = button.dataset.id;
    state.done = state.done.includes(id) ? state.done.filter(item => item !== id) : [...state.done,id];
    const point = data.points.find(item => item.id === id);
    if (state.done.includes(id) && point) state.currentPoint[point.day] = id;
    saveState(); renderDay();
    const openId = new URL(location.href).searchParams.get("place");
    const openPoint = data.points.find(item => item.id === openId && item.detail);
    if (openPoint && !$("#placeOverlay").hidden) renderPlace(openPoint);
    toast(state.done.includes(id) ? "Oznaczono: byłam tutaj" : "Cofnięto oznaczenie");
  }
  if (action === "budget") {
    const checkbox = button;
    if (checkbox.dataset.group && checkbox.checked) {
      $$(`[data-action="budget"][data-group="${checkbox.dataset.group}"]`).forEach(other => { if (other !== checkbox) { other.checked = false; state.budget[other.dataset.id] = false; } });
    }
    state.budget[checkbox.dataset.id] = checkbox.checked; saveState(); updateBudgetTotal();
  }
  if (action === "nearby-food") {
    const current = state.currentPoint[state.day];
    const card = current && $(`[data-near="${current}"]`);
    if (card) { card.scrollIntoView({behavior:"smooth", block:"center"}); card.animate([{outline:"3px solid #d19b3b"},{outline:"3px solid transparent"}],{duration:1600}); }
    else { $("#restaurantGrid").scrollIntoView({behavior:"smooth"}); toast("Lokale najbliższe trasie są poniżej"); }
  }
  if (action === "reset-progress") {
    if (confirm("Wyczyścić cały postęp, zapisane miejsca, preferencje i budżet?")) {
      state.done=[]; state.saved=[]; state.budget={}; state.currentPoint={}; state.energyByDay={}; state.delayPlans={}; state.preferences={pace:"normal",interests:[],budget:"normal"}; state.offlinePreparedAt=null;
      saveState(); renderSaved(); toast("Dane wyczyszczone");
    }
  }
});

document.addEventListener("change", event => {
  if (event.target.id === "currentPointSelect") { if (event.target.value) state.currentPoint[state.day] = event.target.value; else delete state.currentPoint[state.day]; saveState(); renderNextThree(); }
  if (event.target.id === "vegToggle") renderFood();
});

document.addEventListener("click", event => {
  const mode = event.target.closest("[data-mode]");
  if (!mode) return;
  state.routeMode = mode.dataset.mode;
  if (state.routeMode === "full") {
    state.energyByDay[state.day] = "full";
    delete state.delayPlans[state.day];
  }
  saveState(); renderDay();
});

$("#sheetBackdrop").addEventListener("click", event => { if (event.target.id === "sheetBackdrop") sheetClose(); });
document.addEventListener("keydown", event => {
  if (event.key === "Escape") {
    if (!$("#imageLightbox").hidden) return closeImage();
    if (!$("#placeOverlay").hidden) return closePlace();
    if (!$("#sheetBackdrop").hidden) sheetClose();
  }
  if (event.key === "Tab" && !$("#placeOverlay").hidden) {
    const focusable = $$('button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])', $("#placeDialog")).filter(element => !element.closest("[hidden]"));
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
});

window.addEventListener("popstate", event => {
  const id = new URL(location.href).searchParams.get("place");
  const point = data.points?.find(item => item.id === id && item.detail);
  if (point) {
    placeHistoryOwned = Boolean(event.state?.place);
    openPlace(id, { historyMode: "none" });
  } else {
    placeHistoryOwned = false;
    hidePlace();
  }
});

function updateNetwork() {
  const status = $("#networkStatus");
  status.textContent = navigator.onLine ? "online" : "offline";
  status.classList.toggle("is-offline", !navigator.onLine);
}

async function init() {
  loadState();
  try {
    await loadData();
    renderHome();
    const linkedPlaceId = new URL(location.href).searchParams.get("place");
    const linkedPoint = data.points.find(item => item.id === linkedPlaceId && item.detail);
    if (linkedPoint) {
      state.day = linkedPoint.day;
      state.view = "day";
      showView("day");
      openPlace(linkedPoint.id, { historyMode: "none" });
    } else showView("home");
    updateNetwork();
    window.addEventListener("online", updateNetwork);
    window.addEventListener("offline", updateNetwork);
    if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js?v=41", { updateViaCache: "none" }).catch(() => {});
  } catch (error) {
    $("#homeView").innerHTML = `<div class="content-shell empty-state" style="margin-top:40px"><h1>Nie udało się otworzyć przewodnika</h1><p>Uruchom folder przez lokalny serwer WWW. Szczegóły: ${escapeHtml(error.message)}</p></div>`;
  }
}

init();
