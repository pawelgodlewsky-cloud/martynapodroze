import { createStore } from "/guides/core/storage.js";
import { distanceKm, mapsUrl, routeUrl } from "/guides/core/geo.js";
import { applyRouteAdjustment, pointStatus, resumePoint, resetDay, skipPoint, togglePoint, undoRouteAdjustment } from "./progression.js?v=25";
import { placeVisual } from "./place-visuals.js?v=25";
import { POINT_TYPES, activeAlerts, adaptRoute, admissionPolicy, borgheseVisit, isFirstMonday2026, isMonday, isSanSebastianoAnnualClosure, isWinterColosseumSeason, largoArgentinaStatus, resolveRoute, romaPassComparison, romeDateTimeParts, routeStartTime, treviPaidZoneStatus, vaticanMuseumStatus, vaticanVariant } from "./route-rules.js?v=25";
import { DEFAULT_TRIP_PROFILE, datesForTrip, dayIdForDate, migrationForLegacyState, normalizeTripProfile, tripDateRange, tripPlanDayIds } from "./trip-profile.js?v=25";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
const money = value => `${Number(value || 0).toFixed(2).replace(".", ",")} €`;
const demoMode = new URLSearchParams(location.search).get("demo") === "1" || location.pathname.includes("/demo/");
const defaults = { profileVersion:1, view:"today", dayId:"day-1", mapDay:"day-1", mapCategory:"all", done:[], skipped:[], saved:[], current:{}, mode:"full", planner:null, checklist:{}, budgetLimit:0, expenses:[], foodVegetarian:false, offlinePreparedAt:null, arrivalAirport:null, arrivalTransfer:null, arrivalComplete:false, hotelAddress:"", tripProfile:{...DEFAULT_TRIP_PROFILE}, tripDates:{}, anchorSlots:{colosseum:"","vatican-museums":"","borghese-gallery":"","catacombs-san-sebastiano":"","st-peter-dome":""}, routeOptions:{castelInterior:true,vaticanDome:false,vittorianoTerrace:false,torreArgentinaInterior:false,appiaParkPass:false}, startedDays:{}, routeOverrides:{}, adjustments:{}, lastAdjustment:null, dismissedNotices:{}, transition:null };
const store = createStore("rome", defaults);
let state = store.get();
let data = {};
let map = null;
let mapLayer = null;
let tripStep = 0;
let adjustmentPreview = null;
let serviceWorkerRegistration = null;
let updateRequested = false;

async function loadData() {
  const names = ["guide","days","places","restaurants","tickets","transport","phrases","emergency","alerts"];
  const results = await Promise.all(names.map(name => fetch(`data/${name}.json?v=25`,{cache:"no-store"}).then(response => {
    if (!response.ok) throw new Error(`Nie udało się wczytać ${name}`);
    return response.json();
  })));
  data = Object.fromEntries(names.map((name, index) => [name, results[index]]));
}

function persist(patch) { state = store.set(patch); }
function update(updater) { state = store.update(updater); }
function migrateStoredState() {
  try {
    const saved = JSON.parse(localStorage.getItem(store.key) || "null");
    const patch = migrationForLegacyState(saved);
    if (Object.keys(patch).length) persist(patch);
  } catch { persist({profileVersion:1}); }
}
function day() { return data.days.find(item => item.id === state.dayId) || data.days[0]; }
function place(id) {
  const original = data.places.find(item => item.id === id);
  if (!original) return null;
  const item = {...original};
  const selectedDate = state.tripDates?.[state.dayId] || "";
  if (state.anchorSlots?.[id]) item.time = state.anchorSlots[id];
  if (["colosseum","pantheon","castel-santangelo","borghese-gallery","vatican-museums"].includes(id)) {
    const policy=admissionPolicy(id,selectedDate,{slot:state.anchorSlots?.[id] || "",reduced:tripProfile().reducedAdmission});
    item.price=policy.reservationFee ? `${policy.admissionPrice} € + ${policy.reservationFee} € rezerwacji` : `${policy.admissionPrice} €`;
    if(policy.note)item.warning=policy.note;
    item.bookingRequired=policy.reservationRequired;
    if(id==="colosseum" && policy.ticketMethod==="on_site") { item.scheduleType=POINT_TYPES.CONSTRAINED; item.time="przyjdź wcześnie"; }
  }
  if (id === "borghese-gallery") {
    const visit=borgheseVisit(selectedDate,state.anchorSlots?.[id] || "10:00");
    item.duration=visit.duration || item.duration;
    if(state.anchorSlots?.[id]) item.openingNote=`Twój slot ${state.anchorSlots[id]}–${visit.end}. ${visit.admissionPrice} € + ${visit.reservationFee} € obowiązkowej rezerwacji.`;
  }
  if(id==="vatican-museums") { const status=vaticanMuseumStatus(selectedDate); if(!status.open) { item.scheduleType=POINT_TYPES.CONSTRAINED; item.time="zamknięte"; item.warning=status.reason; } else if(status.mode==="last_sunday") { item.scheduleType=POINT_TYPES.CONSTRAINED; item.time="09:00–14:00"; item.warning=status.note; } }
  if(id==="torre-argentina-area") { const status=largoArgentinaStatus(selectedDate,item.time); item.openingNote=`${status.hours || "zamknięte"}; ostatnie wejście ${status.lastEntry || "—"}.`; }
  if(id==="trevi") { const status=treviPaidZoneStatus(selectedDate,item.time); item.openingNote=`Płatna strefa ${status.opening}–${status.closing}, ostatnie wejście ${status.lastEntry}. Widok z placu pozostaje bezpłatny.`; }
  return item;
}
function dayPlaces(selected = day()) { return selected.placeIds.map(place).filter(Boolean); }
function activeIds(selected = day()) {
  const profile = normalizeTripProfile(state.tripProfile);
  const routeState = {...state,mode:"full",planner:{...(state.planner || {}),pace:profile.pace === "slow" ? "slow" : profile.pace,company:profile.travelType === "children" ? "family" : state.planner?.company}};
  const resolved = state.routeOverrides?.[selected.id] || resolveRoute(selected.id,routeState) || selected.placeIds;
  if (state.mode === "quick") return resolved.filter(id => selected.quickIds.includes(id));
  if (state.mode === "rain") {
    const date = state.tripDates?.[selected.id];
    return selected.rainIds.filter(id => !(id === "vatican-museums" && !vaticanMuseumStatus(date).open) && !(id === "borghese-gallery" && isMonday(date)) && !(id === "catacombs-san-sebastiano" && (isMonday(date) || isSanSebastianoAnnualClosure(date))));
  }
  if (state.mode === "tired") return resolved.filter(id => selected.lowEnergyIds.includes(id));
  return resolved;
}
function activePlaces(selected = day()) { return activeIds(selected).map(place).filter(Boolean); }
function progress(selected = day()) {
  const ids = activeIds(selected);
  const done = ids.filter(id => state.done.includes(id)).length;
  const skipped = ids.filter(id => state.skipped?.includes(id)).length;
  return { done, skipped, complete:done + skipped, total: ids.length, percent: ids.length ? Math.round((done + skipped) / ids.length * 100) : 0 };
}
function currentPlace() {
  const selected = day();
  const active = activePlaces(selected);
  const explicit = place(state.current[selected.id]);
  return explicit && active.some(item => item.id === explicit.id) && !state.done.includes(explicit.id) && !state.skipped?.includes(explicit.id) ? explicit : active.find(item => !state.done.includes(item.id) && !state.skipped?.includes(item.id)) || null;
}
function nextPlace(current = currentPlace()) {
  const list = activePlaces();
  const index = list.findIndex(item => item.id === current?.id);
  return index >= 0 ? list[index + 1] : list[0];
}
function isDemoLocked(item, index) { return demoMode && (!data.guide.demo.unlockedDays.includes(day().id) || index >= data.guide.demo.unlockedPlaceCount); }
function toast(message) { const node = $("#toast"); node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 1800); }

const dayMeta = {
  "day-1":{start:"08:15",end:"około 17:00",cost:18,needs:["bilet do Koloseum","dokument tożsamości","wygodne buty i woda"],essential:["colosseum","palatine","forum","vittoriano"]},
  "day-2":{start:"07:45",end:"około 19:00",cost:32,needs:["bilet do Muzeów Watykańskich","dokument tożsamości","zakryte ramiona i kolana"],essential:["vatican-museums","st-peter","pantheon"]},
  "day-3":{start:"08:00",end:"około 18:30",cost:0,needs:["wygodne buty","butelka wody","karta lub trochę gotówki"],essential:["spanish-steps","trevi","trastevere"]},
  "day-4a":{start:"08:45",end:"około 16:00",cost:18,needs:["bilet do Galleria Borghese, jeśli ją wybierasz","dokument tożsamości","wygodne buty"],essential:["borghese-gallery","villa-borghese","pincio"]},
  "day-4b":{start:"08:30",end:"około 16:30",cost:10,needs:["bilet do katakumb, jeśli wchodzisz","buty z dobrą podeszwą","woda"],essential:["appia-antica","catacombs-san-sebastiano"]}
};
const editorialVisuals = new Set(["colosseum","palatine","forum","vatican-museums","st-peter","castel-santangelo","pantheon","spanish-steps","trevi","trastevere","santa-maria-trastevere","gianicolo","borghese-gallery","villa-borghese","pincio","appia-antica","catacombs-san-sebastiano"]);
const closingMinutes = {pantheon:1110,"vittoriano-terrace":1125,"catacombs-san-sebastiano":1005,"borghese-gallery":1140,"torre-argentina-area":945};
const todayIso = () => romeDateTimeParts().date;
const tripProfile = () => normalizeTripProfile(state.tripProfile);
const currentTripDayId = () => dayIdForDate(tripProfile(),todayIso());
const ticketFor = id => data.tickets.find(item => item.id === id || (id === "catacombs-san-sebastiano" && item.id === "catacombs"));
const tripAnchor = selected => {
  const id = selected.reservations?.[0];
  const anchorId = id === "catacombs" ? "catacombs-san-sebastiano" : id;
  if(anchorId==="colosseum" && admissionPolicy("colosseum",state.tripDates?.[selected.id],{slot:state.anchorSlots?.colosseum}).ticketMethod==="on_site") return "Koloseum: darmowy bilet na miejscu, przyjedź wcześnie";
  if(anchorId==="vatican-museums") { const status=vaticanMuseumStatus(state.tripDates?.[selected.id]); if(!status.open)return "Muzea Watykańskie: zamknięte tego dnia"; if(status.mode==="last_sunday")return "Muzea Watykańskie: specjalny tryb 09:00–14:00"; }
  const slot = state.anchorSlots?.[anchorId];
  return anchorId && slot ? `${place(anchorId)?.name || ticketFor(anchorId)?.name}: ${slot}` : anchorId ? `${place(anchorId)?.name || ticketFor(anchorId)?.name}: jeszcze nie masz godziny` : "Bez rezerwacji godzinowej";
};
function dayStart(selected) {
  const anchorId = selected.reservations?.[0] === "catacombs" ? "catacombs-san-sebastiano" : selected.reservations?.[0];
  const slot = state.anchorSlots?.[anchorId];
  return routeStartTime(selected.id,slot,dayMeta[selected.id]?.start || "08:30");
}
function dayCost(selected) {
  const date=state.tripDates?.[selected.id] || "";
  return activeIds(selected).reduce((sum,id) => {
    const policy=admissionPolicy(id,date,{slot:state.anchorSlots?.[id] || "",reduced:tripProfile().reducedAdmission});
    return sum + policy.admissionPrice + policy.reservationFee;
  },0);
}
function accommodationUrl() {
  const profile = tripProfile();
  const destination = profile.accommodationAddress || profile.accommodationName;
  return destination ? transitDirections("",destination,"transit") : "https://www.google.com/maps/dir/?api=1&travelmode=transit";
}
function parsePlaceTime(item) {
  const value = state.anchorSlots?.[item.id] || item.time;
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})/);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 9 * 60;
}
function dayNotice(selected) {
  const date=state.tripDates?.[selected.id] || "";
  if(selected.id==="day-1") {
    const policy=admissionPolicy("colosseum",date,{slot:state.anchorSlots?.colosseum || ""});
    if(policy.ticketMethod==="on_site") return {tone:"info",text:policy.note};
  }
  if(selected.id==="day-2") {
    const status=vaticanMuseumStatus(date);
    if(!status.open) return {tone:"warning",text:status.reason};
    if(status.mode==="last_sunday") return {tone:"info",text:status.note};
  }
  return null;
}
function vaticanMoveCandidate() {
  const current=state.tripDates?.["day-2"];
  if(!current || vaticanMuseumStatus(current).open)return null;
  return Object.entries(state.tripDates || {}).find(([id,date]) => id!=="day-2" && vaticanMuseumStatus(date).open && !(id==="day-1" && state.anchorSlots?.colosseum) && !(id==="day-4a" && state.anchorSlots?.["borghese-gallery"]));
}
function nextAnchorCountdown(selected,current,index) {
  const date=state.tripDates?.[selected.id];
  if(!date || date!==todayIso())return "";
  const candidates=activePlaces(selected).slice(index).filter(item=>item.scheduleType===POINT_TYPES.HARD_ANCHOR && state.anchorSlots?.[item.id]);
  if(state.anchorSlots?.["st-peter-dome"]) candidates.push({id:"st-peter-dome",name:"Kopuła św. Piotra",time:state.anchorSlots["st-peter-dome"]});
  const now=romeDateTimeParts().minutes;
  const next=candidates.map(item=>({...item,left:parsePlaceTime(item)-now})).filter(item=>item.left>0).sort((a,b)=>a.left-b.left)[0];
  if(!next)return "";
  const left=next.left; const remaining=left>=60 ? `${Math.floor(left/60)} h ${left%60 ? `${left%60} min` : ""}` : `${left} min`;
  return `<p class="anchor-countdown ${left<60 ? "is-urgent" : ""}"><b>${escapeHtml(next.name)} ${escapeHtml(next.time)}</b> · za ${escapeHtml(remaining)}${left<60 ? "<br>Nie dodawaj już kolejnego punktu." : ""}</p>`;
}

function setView(view) {
  view = ["today","journey","prepare","plan","food","map","saved","help"].includes(view) ? view : "today";
  persist({ view });
  $$(".view").forEach(node => node.classList.toggle("is-active", node.dataset.view === view));
  $$(".bottom-nav [data-view]").forEach(node => node.classList.toggle("is-active", node.dataset.view === view));
  document.body.dataset.activeView = view;
  $$(".bottom-nav [data-view]").forEach(node => { if (node.dataset.view === view) node.setAttribute("aria-current","page"); else node.removeAttribute("aria-current"); });
  if (view === "map") setTimeout(renderMap, 80);
  if (view === "saved") renderSaved();
  if (view === "plan" && state.dayId.startsWith("day-4")) $(".plan-settings").open = true;
  scrollTo({ top:0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function transitDirections(origin, destination, travelMode = "transit") {
  const url = new URL("https://www.google.com/maps/dir/");
  url.searchParams.set("api", "1");
  if (origin) url.searchParams.set("origin", origin);
  url.searchParams.set("destination", destination);
  url.searchParams.set("travelmode", travelMode);
  return url.toString();
}

function renderArrivalJourney() {
  const node = $("#arrivalJourney");
  if (state.arrivalComplete) {
    node.innerHTML = `<div class="arrival-complete"><span class="arrival-seal" aria-hidden="true">✓</span><div><p class="eyebrow">KROK 0 · GOTOWE</p><h2 id="arrivalTitle">Benvenuta a Roma</h2><p>Dojazd z lotniska za Tobą. Teraz przewodnik prowadzi do pierwszego punktu dnia.</p></div><div class="arrival-complete-actions"><button class="button primary" data-action="continue">Wybierz dzień zwiedzania</button><button class="text-button" data-action="arrival-reset">Zmień lotnisko lub dojazd</button></div></div>`;
    return;
  }
  const airport = state.arrivalAirport === "FCO" ? data.transport.fiumicino : state.arrivalAirport === "CIA" ? data.transport.ciampino : null;
  const hasTransfer = state.arrivalTransfer !== null && state.arrivalTransfer !== undefined;
  const selectedOption = hasTransfer ? airport?.options?.[Number(state.arrivalTransfer)] : null;
  const origin = airport?.code === "FCO" ? "Aeroporto di Roma Fiumicino" : "Aeroporto di Roma Ciampino";
  const fallbackDestination = selectedOption?.destination || "Roma Termini";
  const destination = state.hotelAddress.trim() || fallbackDestination;
  node.innerHTML = `<div class="arrival-heading"><div><p class="eyebrow">KROK 0 · TU ZACZYNA SIĘ PODRÓŻ</p><h2 id="arrivalTitle">Od wyjścia z lotniska.<br>Bez zgadywania.</h2><p>Odbierz bagaż, wybierz lotnisko i dojazd. Dalej pójdziemy krok po kroku.</p></div><span class="travel-stamp">USCITA<br><b>→ ROMA</b></span></div>
    <div class="airport-choice" role="group" aria-label="Wybierz lotnisko przylotu">
      ${[data.transport.fiumicino,data.transport.ciampino].map(item => `<button class="airport-choice-card ${airport?.code === item.code ? "is-active" : ""}" data-action="arrival-airport" data-airport="${item.code}" aria-pressed="${airport?.code === item.code}"><span>${item.code}</span><div><small>PRZYLATUJĘ NA</small><b>${escapeHtml(item.title)}</b></div></button>`).join("")}
    </div>
    ${!airport ? `<div class="arrival-empty"><span>01</span><p>Wybierz lotnisko. Od razu pokażę Ci, gdzie iść po wyjściu z hali przylotów.</p></div>` : `<div class="arrival-route">
      <ol class="arrival-steps">
        <li class="is-active"><span>01</span><div><small>TERAZ</small><h3>Wyjdź do hali przylotów</h3><p>${escapeHtml(airport.arrival)}</p></div></li>
        <li class="${selectedOption ? "is-active" : ""}"><span>02</span><div><small>NASTĘPNIE</small><h3>Wybierz dojazd do swojej dzielnicy</h3><p>${selectedOption ? `Wybrano: ${escapeHtml(selectedOption.best)}. ${escapeHtml(selectedOption.detail)}` : "Nie jedź automatycznie na Termini — wybierz wariant pasujący do adresu noclegu."}</p></div></li>
        <li class="${selectedOption ? "is-active" : ""}"><span>03</span><div><small>CEL</small><h3>Dojedź do noclegu</h3><p>${state.hotelAddress ? `Cel zapisany na tym urządzeniu: ${escapeHtml(state.hotelAddress)}` : `Domyślny punkt orientacyjny: ${escapeHtml(fallbackDestination)}. Możesz wpisać dokładny adres noclegu poniżej.`}</p></div></li>
      </ol>
      <div class="arrival-decisions"><div><p class="card-label">NAJLEPSZY DOJAZD DLA CIEBIE</p><div class="arrival-options">${airport.options.map((option,index) => `<button class="arrival-option ${hasTransfer && Number(state.arrivalTransfer) === index ? "is-active" : ""}" data-action="arrival-transfer" data-index="${index}" aria-pressed="${hasTransfer && Number(state.arrivalTransfer) === index}"><small>${escapeHtml(option.for)}</small><b>${escapeHtml(option.best)}</b><span>${escapeHtml(option.detail)}</span></button>`).join("")}</div></div>
      <form class="hotel-route-form" id="hotelRouteForm"><label for="hotelAddress"><span>Adres noclegu <small>(opcjonalnie, zapis tylko na tym urządzeniu)</small></span><input id="hotelAddress" name="hotelAddress" value="${escapeHtml(state.hotelAddress)}" placeholder="np. Via Cavour 20, Roma" autocomplete="street-address"></label><button class="mini-button" type="submit">Zapisz adres</button></form>
      ${selectedOption ? `<div class="arrival-go"><div><span>GOTOWA TRASA</span><b>${escapeHtml(airport.code)} → ${escapeHtml(destination)}</b></div><a class="button primary" href="${transitDirections(origin,destination,selectedOption.travelMode)}" target="_blank" rel="noopener">Prowadź mnie z lotniska</a><button class="button quiet" data-action="arrival-complete">Jestem już w Rzymie</button></div>` : `<p class="arrival-hint">Wybierz wariant dojazdu, aby dostać gotową trasę i przejść dalej.</p>`}</div>
    </div>`}`;
}

function renderToday() {
  const profile = tripProfile();
  const selected = day();
  document.body.classList.toggle("has-my-rome",profile.configured);
  document.body.classList.toggle("is-day-started",Boolean(state.startedDays?.[selected.id]));
  if (!profile.configured) {
    $("#todayPanel").innerHTML = `<article class="resume-card welcome-card"><span class="resume-icon" aria-hidden="true">◎</span><div><p class="eyebrow">MÓJ RZYM</p><h2>Ułóż podróż wokół swoich biletów.</h2><p>Daty i godziny są opcjonalne. Możesz też od razu otworzyć gotowe trasy.</p></div><div class="today-actions"><button class="button primary" data-action="open-trip">Dopasuj mój Rzym</button><button class="button quiet" data-action="view" data-view="plan">Zobacz gotowy plan</button></div></article>`;
    renderHomeDays();
    return;
  }
  const started = Boolean(state.startedDays?.[selected.id]);
  $("#todayPanel").innerHTML = started ? renderStreetGuide(selected) : renderDayBrief(selected);
  $("#homeDays").innerHTML = "";
}

function renderDayBrief(selected) {
  const meta = dayMeta[selected.id] || dayMeta["day-1"];
  const p = progress(selected);
  const notice=dayNotice(selected); const move=state.dismissedNotices?.vaticanMove ? null : vaticanMoveCandidate(); const domeUnknown=selected.id==="day-2" && state.anchorSlots?.["st-peter-dome"] && !["sobieski","lambertini"].includes(tripProfile().domeRoute);
  return `<article class="day-brief">
    <header><div><p class="eyebrow">DZISIAJ · DZIEŃ ${escapeHtml(selected.number)}</p><h2>${escapeHtml(selected.title)}</h2><p>${escapeHtml(selected.subtitle)}</p></div><span class="day-number">${escapeHtml(selected.number)}</span></header>
    <div class="brief-metrics"><div><small>START</small><b>${dayStart(selected)}</b></div><div><small>KONIEC</small><b>${escapeHtml(meta.end)}</b></div><div><small>SPACER</small><b>około ${escapeHtml(selected.distance)}</b></div></div>
    <div class="brief-columns"><section><p class="card-label">DZISIAJ POTRZEBUJESZ</p><ul>${meta.needs.slice(0,5).map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></section><section><p class="card-label">NAJWAŻNIEJSZE</p><strong>${escapeHtml(tripAnchor(selected))}</strong><p>Szacowany koszt dnia: <b>około ${money(dayCost(selected))} / osoba</b></p></section></div>
    ${notice ? `<div class="day-notice ${notice.tone}"><b>Ważne na ten dzień</b><p>${escapeHtml(notice.text)}</p>${move ? `<p>Przenieść Watykan na ${new Date(`${move[1]}T12:00:00Z`).toLocaleDateString("pl-PL",{weekday:"long",day:"numeric",month:"long",timeZone:"Europe/Rome"})}?</p><div><button class="mini-button" data-action="move-vatican" data-target="${move[0]}">ZASTOSUJ</button><button class="text-button" data-action="dismiss-vatican-move">ZOSTAW BEZ ZMIAN</button></div>` : ""}</div>` : ""}
    ${domeUnknown ? `<div class="day-notice info"><b>Kopuła św. Piotra</b><p>Sprawdź mail z biletem — od przydzielonej trasy zależy kolejność Bazyliki i kopuły. Winda nie wjeżdża na sam szczyt; po windzie zostaje około 320 schodów, a końcowy fragment jest wąski i stromy.</p></div>` : ""}
    ${p.complete ? `<p class="brief-progress">Zapisany postęp: ${p.complete} / ${p.total}</p>` : ""}
    <button class="button primary full street-primary" data-action="start-day">${p.complete ? "KONTYNUUJ DZIEŃ" : "ROZPOCZNIJ DZIEŃ"}</button>
    <div class="brief-links"><button class="text-button" data-action="open-trip">Edytuj wyjazd</button>${tripProfile().accommodationAddress || tripProfile().accommodationName ? `<a href="${accommodationUrl()}" target="_blank" rel="noopener">Sprawdź trasę z noclegu <small>· wymaga internetu</small></a>` : ""}</div>
  </article>`;
}

function renderStreetGuide(selected) {
  const ids = activeIds(selected);
  const p = progress(selected);
  const current = currentPlace();
  if (state.transition?.dayId === selected.id) {
    const completed = place(state.transition.completedId);
    const upcoming = place(state.transition.nextId);
    return `<article class="transition-card"><span class="done-seal">✓</span><p class="eyebrow">GOTOWE</p><h2>${escapeHtml(completed?.name || "Punkt ukończony")}</h2>${upcoming ? `<div class="next-step"><small>NASTĘPNY PUNKT</small><h3>${escapeHtml(upcoming.name)}</h3><p>${escapeHtml(completed?.next?.distance || "kolejny punkt")} · ${escapeHtml(completed?.next?.minutes || "")} min pieszo</p></div><a class="button primary full" href="${mapsUrl(upcoming.coordinates)}" target="_blank" rel="noopener">PROWADŹ MNIE <small>· internet</small></a><button class="button quiet full" data-action="transition-next">PRZEJDŹ DALEJ</button>` : `<p>To wszystkie punkty tego dnia. Brawo — reszta wieczoru jest Twoja.</p><a class="button primary full" href="${accommodationUrl()}" target="_blank" rel="noopener">WRÓĆ DO NOCLEGU <small>· internet</small></a><button class="button quiet full" data-action="finish-day">ZAKOŃCZ DZIEŃ</button>`}</article>`;
  }
  if (!current) return `<article class="transition-card"><span class="done-seal">✓</span><p class="eyebrow">DZIEŃ UKOŃCZONY</p><h2>Roma zrobiona po Twojemu.</h2><p>${p.done} miejsca oznaczone jako gotowe, ${p.skipped} pominięte.</p><a class="button primary full" href="${accommodationUrl()}" target="_blank" rel="noopener">WRÓĆ DO NOCLEGU <small>· internet</small></a></article>`;
  const index = ids.indexOf(current.id);
  const visual = editorialVisuals.has(current.id) ? placeVisual(current) : null;
  const countdown=nextAnchorCountdown(selected,current,index);
  return `<article class="street-card">
    <div class="street-progress"><div><span>${index + 1} Z ${ids.length}</span><b>${p.complete} / ${p.total} punktów</b></div><div class="progress-track"><i style="width:${p.percent}%"></i></div></div>
    <header><p class="eyebrow">TERAZ · ${escapeHtml(selected.title)}</p><h2>${escapeHtml(current.name)}</h2><strong>${escapeHtml(current.time)} · ${current.duration} min</strong>${countdown}</header>
    ${visual ? `<figure class="street-visual">${visual}</figure>` : `<div class="route-instruction"><span aria-hidden="true">↝</span><p>Ten punkt jest krótkim odcinkiem trasy. Skup się na wskazówce i przejdź dalej bez dodatkowego przystanku fotograficznego.</p></div>`}
    <p class="street-description">${escapeHtml(current.description)}</p>
    <div class="street-essential"><p><b>Najważniejsze:</b> ${escapeHtml(current.tip)}</p>${current.warning ? `<p><b>Uwaga:</b> ${escapeHtml(current.warning)}</p>` : ""}${current.verifiedAt && current.scheduleType !== POINT_TYPES.FLEX ? `<p class="source-line">Sprawdzone ${escapeHtml(current.verifiedAt.split("-").reverse().join("."))} · <a href="${current.officialSource || current.officialUrl}" target="_blank" rel="noopener">Oficjalne źródło ↗ <small>internet</small></a></p>` : ""}</div>
    <div class="street-actions"><a class="button primary full" href="${mapsUrl(current.coordinates)}" target="_blank" rel="noopener">PROWADŹ MNIE <small>· internet</small></a><button class="button ink full" data-action="done" data-id="${current.id}">MAM TO ✓</button><button class="text-button" data-action="skip" data-id="${current.id}">Pomiń</button><button class="text-button" data-action="toggle-rescue">Zmień plan</button><button class="text-button" data-action="open-place" data-id="${current.id}">Więcej info</button></div>
    <div class="rescue-actions" hidden><span>Co się zmieniło?</span><button data-action="open-rescue" data-kind="delay">Spóźniam się</button><button data-action="open-rescue" data-kind="tired">Jestem zmęczona</button><button data-action="open-rescue" data-kind="rain">Pada</button></div>
    ${state.lastAdjustment?.dayId===selected.id ? `<button class="undo-adjustment" data-action="undo-rescue">COFNIJ ZMIANĘ</button>` : ""}
  </article>`;
}

function landmark(number) {
  const drawings = {
    1:'<path d="M20 95V51Q90 20 160 51V95M20 62Q90 35 160 62M20 79Q90 53 160 79M20 95H160"/><path d="M32 89V77m20 12V71m20 18V68m20 21V68m20 21V71m20 18V76m16 13V80M32 61v-9m20 4v-10m20 7V42m20 11V42m20 14V46m20 15V52m16 14v-9"/>',
    2:'<path d="M20 96H160M42 95V70H138V95M55 68Q58 31 90 29Q122 31 125 68M65 65Q67 36 90 29Q112 36 115 65M90 29V17m-6 4h12M52 76H128M68 95V83m22 12V83m22 12V83M32 95V60h12m92 0h12v35"/>',
    3:'<path d="M20 100H160M35 90H145M50 80H130M62 70H118M75 60H105M60 50V25h60v25M73 24V13m34 11V13M80 50V38h20v12M20 92V58m-8 8 8-15 8 15M152 88V55m-8 8 8-15 8 15"/>',
    4:'<path d="M20 100H160M85 98V51M53 53Q27 49 39 31Q43 12 69 22Q89 5 110 23Q140 15 145 35Q152 53 123 56Z M35 99V81h32v18m-37-18h42M109 99V79h28v20m-33-20h38"/>'
  };
  return `<svg viewBox="0 0 180 120" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${drawings[number]}</svg>`;
}
function renderHomeDays() {
  const short = ["Koloseum, Forum i ślady cesarzy","Watykan, mosty i wielkie place","Trevi, zaułki i Trastevere","Borghese lub starożytna Via Appia"];
  $("#homeDays").innerHTML = `<header><div><p class="eyebrow">3 DNI + DZIEŃ DODATKOWY</p><h2>Wybierz swój kawałek Rzymu.</h2></div><button class="text-button" data-action="open-planner">Dopasuj plan do siebie ↗</button></header><div class="day-gallery">${["day-1","day-2","day-3","day-4a"].map((id,i) => { const d=data.days.find(x=>x.id===id); return `<button class="day-tile day-color-${i+1}" data-action="day-main" data-day="${i+1}"><div class="day-art"><span>${i === 3 ? "DZIEŃ +1" : `DZIEŃ ${i+1}`}</span>${landmark(i+1)}<b aria-hidden="true">↗</b></div><div class="day-tile-copy"><h3>${["Antyczne serce","Watykan i centrum","La dolce vita","Jeszcze jeden dzień"][i]}</h3><p>${short[i]}</p><small>${d.duration} · ${d.distance}</small></div></button>`; }).join("")}</div>`;
}

function plannerSummary() {
  if (!state.planner) return "";
  const { duration, pace, interests } = state.planner;
  const count = duration === "hours" ? 1 : Math.min(Number(duration) || 3, 4);
  let ids = ["day-1","day-2","day-3"];
  if (interests.includes("vatican")) ids = ["day-2","day-1","day-3"];
  if (interests.includes("streets") || interests.includes("food")) ids = ["day-3","day-1","day-2"];
  if (count >= 4) ids.push(interests.includes("hidden") || interests.includes("history") ? "day-4b" : "day-4a");
  ids = ids.slice(0,count);
  return `<article class="today-card"><span class="card-label">Twój dopasowany wariant</span><h2>${duration === "hours" ? "Kilka godzin" : `${duration} ${duration === "1" ? "dzień" : "dni"}`} · ${pace === "slow" ? "spokojnie" : pace === "max" ? "maksimum" : "normalnie"}</h2><p>${ids.map(id => data.days.find(item => item.id === id)?.title).filter(Boolean).join(" → ")}</p><div class="today-actions"><button class="mini-button" data-action="open-planner">Zmień odpowiedzi</button></div></article>`;
}

function renderReservations() {
  $("#reservations").innerHTML = `<p class="eyebrow">PRZED WYJAZDEM</p><h2>Co zarezerwować wcześniej</h2><div class="booking-list">${data.tickets.map(ticket => `<article class="booking-card"><span class="status-pill ${ticket.required ? "required" : ""}">${ticket.required ? "rezerwuj" : "opcjonalnie"}</span><b>${escapeHtml(ticket.name)}</b><p><strong>Kiedy:</strong> ${escapeHtml(ticket.when)}</p><p><strong>Koszt:</strong> ${escapeHtml(ticket.price)}</p><p><strong>Nie rób:</strong> ${escapeHtml(ticket.avoid)}</p><div class="place-actions"><a href="${ticket.ticketUrl}" target="_blank" rel="noopener">Oficjalny zakup</a></div><div class="source-line">Sprawdzone ${verified(ticket)} · <a href="${ticket.sourceUrl}" target="_blank" rel="noopener">źródło</a></div></article>`).join("")}</div>`;
}

function renderAirportGuide() {
  const airports = [data.transport.fiumicino, data.transport.ciampino];
  $("#airportGuide").innerHTML = `<div class="section-heading-rome"><div><p class="eyebrow">PIERWSZY I OSTATNI ODCINEK</p><h2>Przylot i odlot bez chaosu</h2><p>Najpierw wybierz lotnisko, potem dzielnicę noclegu. Termini nie zawsze jest najlepszą przesiadką.</p></div><span class="travel-stamp">ARRIVI<br><b>PARTENZE</b></span></div><div class="airport-grid">${airports.map(airport => `<article class="airport-card"><header><span>${escapeHtml(airport.code)}</span><div><small>LOTNISKO</small><h3>${escapeHtml(airport.title)}</h3></div></header><div class="airport-arrival"><b>Po przylocie</b><p>${escapeHtml(airport.arrival)}</p></div><div class="transfer-options">${(airport.options || []).map(option => `<div><small>${escapeHtml(option.for)}</small><h4>${escapeHtml(option.best)}</h4><p>${escapeHtml(option.detail)}</p></div>`).join("")}</div><details><summary>Plan odlotu krok po kroku</summary><ol>${(airport.departure || []).map(step => `<li>${escapeHtml(step)}</li>`).join("")}</ol></details><div class="airport-actions"><a href="${airport.officialUrl}" target="_blank" rel="noopener">Aktualne połączenia</a>${airport.ticketUrl ? `<a href="${airport.ticketUrl}" target="_blank" rel="noopener">Kup pociąg</a>` : ""}<a href="${data.transport.back[airport.code === "FCO" ? "fco" : "cia"]}" target="_blank" rel="noopener">Trasa na lotnisko</a></div><div class="source-line">Sprawdzone ${verified(airport)} · <a href="${airport.taxiUrl}" target="_blank" rel="noopener">oficjalne taryfy taxi</a></div></article>`).join("")}</div>`;
  const transportAlerts=activeAlerts(data.alerts,todayIso()).filter(alert=>["fiumicino","roma-termini"].includes(alert.affectedPlace));
  if(transportAlerts.length) $("#airportGuide").insertAdjacentHTML("afterbegin",transportAlerts.map(alert=>`<div class="day-notice warning"><b>${escapeHtml(alert.title)}</b><p>${escapeHtml(alert.description)}</p></div>`).join(""));
}

function romaPassVerdict() {
  const duration = state.planner?.duration || "3";
  const selectedDays = duration === "4" ? ["day-1","day-2","day-3",state.dayId.startsWith("day-4") ? state.dayId : "day-4a"] : duration === "2" ? ["day-1","day-2"] : ["day-1","day-2","day-3"];
  const costs = {colosseum:18,"castel-santangelo":18,pantheon:7,"borghese-gallery":16,"vittoriano-terrace":18,"torre-argentina-area":7,"vatican-museums":25};
  const ids = [...new Set(selectedDays.flatMap(id => resolveRoute(id,{...state,mode:"full"}) || data.days.find(item => item.id === id)?.placeIds || []))];
  const result = romaPassComparison({duration,attractionCosts:ids.filter(id => costs[id]).map(id => ({price:costs[id],eligible:id !== "vatican-museums",vatican:id === "vatican-museums"}))});
  return `${result.worthwhile ? "Przy Twoim planie Roma Pass wygląda korzystnie cenowo." : "Przy tym planie bilety osobno prawdopodobnie wyjdą taniej."} Szacunek: osobno ${money(result.separate)}, z kartą ${money(result.withPass)}. Watykan nie jest wliczony do pokrycia kartą.`;
}

function renderTicketGuide() {
  const city = data.transport.city;
  const pass = data.transport.romaPass;
  $("#ticketGuide").innerHTML = `<div class="section-heading-rome"><div><p class="eyebrow">CO KUPIĆ</p><h2>Bilety i Roma Pass</h2><p>${escapeHtml(city.best)}</p></div></div><div class="fare-strip">${city.tickets.map(ticket => `<article><span>${escapeHtml(ticket.name)}</span><strong>${escapeHtml(ticket.price)}</strong><p>${escapeHtml(ticket.note)}</p></article>`).join("")}</div><div class="ticket-notes"><p><b>Tap&Go:</b> ${escapeHtml(city.tap)}</p><p><b>Gdzie działa:</b> ${escapeHtml(city.scope)}</p>${(city.stations || []).map(station => `<p><b>${escapeHtml(station.name)} · ${escapeHtml(station.lines.join(" + "))}:</b> ${escapeHtml(station.note)}</p>`).join("")}</div><article class="roma-pass-card"><header><div><p class="eyebrow">KARTA TURYSTYCZNA</p><h3>${escapeHtml(pass.title)}</h3></div><span>ROMA<br>PASS</span></header><div class="pass-variants">${pass.variants.map(variant => `<div><small>${escapeHtml(variant.name)}</small><strong>${escapeHtml(variant.price)}</strong><p>${escapeHtml(variant.included)}</p><p>${escapeHtml(variant.after)}</p></div>`).join("")}</div><div class="pass-columns"><div><h4>Dodatkowo dostajesz</h4><ul>${pass.extras.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div><div class="pass-no"><h4>Tego karta nie obejmuje</h4><ul>${pass.notIncluded.map(item => `<li>${escapeHtml(item)}</li>`).join("")}</ul></div></div><div class="pass-warning"><b>Ważna aktywacja</b><p>${escapeHtml(pass.activation)}</p></div><div class="pass-verdict"><span>WERDYKT DLA TEGO PLANU</span><p>${escapeHtml(romaPassVerdict())}</p></div><div class="airport-actions"><a href="${pass.officialUrl}" target="_blank" rel="noopener">Sprawdź Roma Pass</a><a href="${city.officialUrl}" target="_blank" rel="noopener">Cennik ATAC</a></div><div class="source-line">Sprawdzone ${verified(pass)} · ceny sprawdź ponownie przed zakupem</div></article>`;
}

function renderPractical() {
  const transport = data.transport;
  $("#practical").innerHTML = `<p class="eyebrow">PRAKTYCZNIE</p><h2>Rzeczy, które oszczędzają czas</h2><div class="utility-grid">
    <article class="utility-card"><span class="card-label">Transport</span><h3>${transport.city.title}</h3><p>${transport.city.best}</p><a class="text-button" href="#ticketGuide">Bilety i Roma Pass</a></article>
    <article class="utility-card"><span class="card-label">Woda</span><h3>Nasoni</h3><p>Darmowa woda pitna jest dostępna w tysiącach miejskich fontann. Wybrane punkty są na mapie.</p><a class="text-button" href="https://www.turismoroma.it/en/node/167736" target="_blank" rel="noopener">Oficjalna mapa wody</a></article>
    <article class="utility-card"><span class="card-label">Offline</span><h3>${state.offlinePreparedAt ? "Gotowe na wyjście" : "Zapisz przed wyjściem"}</h3><p>Plan i adresy działają offline. Mapa bazowa i bieżące rozkłady wymagają internetu.</p><button class="text-button" data-action="offline">${state.offlinePreparedAt ? "Odśwież dane offline" : "Przygotuj offline"}</button></article>
    <article class="utility-card"><span class="card-label">Upał</span><h3>Przesuń, nie przyspieszaj</h3><p>Zewnętrzne odcinki rób rano i po 17:00. W środku dnia wybierz muzeum, bazylikę lub dłuższy obiad.</p><button class="text-button" data-action="scenario" data-scenario="heat">Plan na upał</button></article>
  </div>`;
}

function modeLabel() { return ({full:"pełny",quick:"mało czasu",rain:"deszcz",tired:"spokojny"})[state.mode] || "pełny"; }
function checked(value) { return value ? "checked" : ""; }
function verified(item) { return item.verifiedAt || item.lastVerified || "2026-09-05"; }
function scheduleLabel(type,item=null) {
  if(type===POINT_TYPES.HARD_ANCHOR)return "REZERWACJA NA GODZINĘ";
  if(type===POINT_TYPES.CONSTRAINED) {
    const lastEntry=item?.openingNote?.match(/ostatnie wejście\s+([0-9:]+)/i)?.[1];
    return lastEntry ? `OSTATNIE WEJŚCIE ${lastEntry}` : "OGRANICZONE GODZINAMI";
  }
  return "";
}
function routeConfiguration(selected) {
  const date = state.tripDates?.[selected.id] || "";
  const slot = (id,label) => `<label><span>${label}</span><input type="time" value="${escapeHtml(state.anchorSlots?.[id] || "")}" data-route-slot="${id}"></label>`;
  const option = (id,label) => `<label class="route-check"><input type="checkbox" data-route-option="${id}" ${checked(state.routeOptions?.[id])}><span>${label}</span></label>`;
  let controls = "";
  if (selected.id === "day-1") controls = slot("colosseum","Slot Koloseum") + option("vittorianoTerrace","Dodaj płatny taras VIVE");
  if (selected.id === "day-2") controls = slot("vatican-museums","Slot Muzeów Watykańskich") + slot("st-peter-dome","Slot kopuły (tylko z rezerwacją)") + option("castelInterior","Rozważ wnętrze Castel Sant’Angelo");
  if (selected.id === "day-3") controls = option("torreArgentinaInterior","Chcę wejść na teren Largo Argentina");
  if (selected.id === "day-4a") controls = slot("borghese-gallery","Slot Galleria Borghese");
  if (selected.id === "day-4b") controls = slot("catacombs-san-sebastiano","Slot katakumb") + option("appiaParkPass","Dodaj obiekt z karnetu Parco Appia");
  return `<div class="route-configuration"><label><span>Data tego dnia</span><input type="date" value="${escapeHtml(date)}" data-route-date="${selected.id}"></label>${controls}</div>`;
}
function routeGuidance(selected) {
  const date = state.tripDates?.[selected.id] || "";
  const slot = state.anchorSlots || {};
  const notes = [];
  if (selected.id === "day-1") {
    const policy=admissionPolicy("colosseum",date,{slot:slot.colosseum});
    notes.push(policy.ticketMethod==="on_site" ? policy.note : `Koloseum ${slot.colosseum || "08:30"} ma pierwszeństwo przed godzinami przykładowymi.`);
    if (policy.ticketMethod!=="on_site" && (slot.colosseum || "08:30") > "10:30") notes.push("Przy tym slocie Forum i Palatyn są przed Koloseum.");
    if (isWinterColosseumSeason(date)) notes.push("Wariant zimowy nie zostawia Forum i Palatynu na późne popołudnie.");
  }
  if (selected.id === "day-2") {
    const status=vaticanMuseumStatus(date);
    if(!status.open) notes.push(status.reason);
    else {
      const variant = vaticanVariant(slot["vatican-museums"] || "08:30");
      notes.push(`Wariant Watykan: ${variant === "early" ? "wcześnie" : variant === "medium" ? "średnio" : "późno"}.`);
      notes.push("Po Muzeach plan zakłada wyjście i 45–75 min na dojście, kolejkę i security do bazyliki.");
    }
    if (slot["st-peter-dome"]) notes.push(`Kopuła ${slot["st-peter-dome"]} jest osobną rezerwacją. Kolejność zależy od trasy wskazanej w mailu z biletem.`);
    if (isMonday(date)) notes.push(isFirstMonday2026(date) ? "To jeden z pięciu specjalnych poniedziałków 2026: Castel działa 14:00–20:00, ostatnie wejście 19:00, bilet 5 € na miejscu." : "Poniedziałek: wnętrze Castel Sant’Angelo jest pominięte.");
  }
  if (selected.id === "day-3" && !activeIds(selected).includes("gianicolo")) notes.push("Spokojny/rodzinny wariant kończy się w Trastevere; Gianicolo pozostaje opcją.");
  if (selected.id === "day-4a" && isMonday(date)) notes.push("Poniedziałek: Galleria Borghese jest pominięta; zostaje park, Pincio i spokojny spacer.");
  if (selected.id === "day-4b" && (isMonday(date) || isSanSebastianoAnnualClosure(date))) notes.push("Dostępny jest wariant outdoorowy Via Appia bez obiecywania wejścia do katakumb.");
  const alertDate = date || todayIso();
  const alerts = activeAlerts(data.alerts,alertDate).filter(alert => activeIds(selected).includes(alert.affectedPlace));
  return `<div class="route-guidance">${notes.map(note => `<p>${escapeHtml(note)}</p>`).join("")}${alerts.map(alert => `<p class="route-alert"><b>${escapeHtml(alert.title)}</b> ${escapeHtml(alert.description)} <small>${escapeHtml(alert.sourceLabel)}</small></p>`).join("")}</div>`;
}
function renderDaySwitcher() {
  const selectedMain = state.dayId.startsWith("day-4") ? "4" : state.dayId.replace("day-", "");
  const labels = [
    ["1","Starożytny Rzym","Koloseum i Forum"],
    ["2","Watykan","Bazylika i muzea"],
    ["3","Dolce vita","Trevi i Trastevere"],
    ["4","Dzień dodatkowy","Borghese lub Via Appia"]
  ];
  $("#daySwitcher").innerHTML = labels.map(([number,title,subtitle]) => `<button aria-pressed="${selectedMain === number}" class="${selectedMain === number ? "is-active" : ""}" data-action="day-main" data-day="${number}"><span>${number}</span><div><small>DZIEŃ ${number}</small><b>${title}</b><em>${subtitle}</em></div></button>`).join("");
}
function renderDayOverview() {
  const selected = day();
  const fourthDayChoice = selected.id.startsWith("day-4") ? `<div class="fourth-day-choice" role="group" aria-label="Wybierz wariant dnia czwartego"><button class="${selected.id === "day-4a" ? "is-active" : ""}" data-action="day" data-id="day-4a"><small>WARIANT A</small><b>Borghese i park</b><span>spokojniej · 4,2 km</span></button><button class="${selected.id === "day-4b" ? "is-active" : ""}" data-action="day" data-id="day-4b"><small>WARIANT B</small><b>Via Appia i katakumby</b><span>dalej od centrum · 6–10 km</span></button></div>` : "";
  const dayLabel = selected.number.startsWith("04") ? `04 · WARIANT ${selected.number.at(-1)}` : selected.number;
  $("#dayOverview").innerHTML = `${fourthDayChoice}<article class="day-intro"><p class="eyebrow">DZIEŃ ${dayLabel} / ${modeLabel()}</p><h3>${escapeHtml(selected.title)}</h3><p>${escapeHtml(selected.anchor)}</p><div class="day-facts"><span><b>${selected.duration}</b>cały plan</span><span><b>${selected.distance}</b>łączna trasa</span><span><b>${selected.intensity}</b>tempo</span><span><b>${selected.cost}</b>atrakcje</span><span><b>${selected.start}</b>zacznij</span></div>${routeConfiguration(selected)}${routeGuidance(selected)}<div class="route-modes" aria-label="Wybierz wariant intensywności"><button class="${state.mode === "full" ? "is-active" : ""}" data-action="mode" data-mode="full"><b>Pełna trasa</b><span>wszystkie punkty</span></button><button class="${state.mode === "quick" ? "is-active" : ""}" data-action="mode" data-mode="quick"><b>Mam mało czasu</b><span>tylko najważniejsze</span></button><button class="${state.mode === "tired" ? "is-active" : ""}" data-action="mode" data-mode="tired"><b>Spokojniej</b><span>mniej chodzenia</span></button><button class="${state.mode === "rain" ? "is-active" : ""}" data-action="mode" data-mode="rain"><b>Pada</b><span>więcej wnętrz</span></button></div></article>`;
}

function modeIcon(mode = "") {
  if (mode.includes("autobus") || mode.includes("transport") || mode.includes("metro")) return "BUS";
  return "PIESZO";
}

function legInfo(from, to) {
  if (!from || !to) return null;
  if (from.next?.to === to.id) return { minutes:from.next.minutes, distance:from.next.distance, mode:from.next.mode, approximate:false };
  const km = Math.max(.1, distanceKm(from.coordinates,to.coordinates) * 1.22);
  return { minutes:Math.max(3,Math.round(km / 4.5 * 60)), distance:`około ${km.toFixed(1).replace(".",",")} km`, mode:"pieszo", approximate:true };
}

function segmentUrl(from,to,leg) {
  return transitDirections(from.coordinates.join(","),to.coordinates.join(","),leg?.mode.includes("transport") || leg?.mode.includes("autobus") ? "transit" : "walking");
}
function nextDayId() {
  if (state.dayId === "day-1") return "day-2";
  if (state.dayId === "day-2") return "day-3";
  if (state.dayId === "day-3") return "day-4a";
  return null;
}

function renderDayCompanion() {
  const selected = day();
  const items = activePlaces(selected);
  const current = currentPlace();
  const stats = progress(selected);
  const completedActive = items.filter(item => state.done.includes(item.id)).length;
  if (!current) {
    const following = nextDayId();
    $("#dayCompanion").innerHTML = `<article class="companion-complete"><span class="companion-laurel" aria-hidden="true">✓</span><div><p class="eyebrow">DZIEŃ UKOŃCZONY</p><h3>${escapeHtml(selected.title)} za Tobą</h3><p>Wszystkie punkty tego wariantu są oznaczone jako odwiedzone.</p></div>${following ? `<button class="button primary" data-action="day" data-id="${following}">Przejdź do następnego dnia</button>` : `<button class="button primary" data-action="view" data-view="saved">Zobacz całą podróż</button>`}</article>`;
    return;
  }
  const index = items.findIndex(item => item.id === current.id);
  const upcoming = items[index + 1];
  const leg = legInfo(current,upcoming);
  const booking = data.tickets.find(ticket => selected.reservations.includes(ticket.id) && current.name.toLowerCase().includes(ticket.name.split(" ")[0].toLowerCase()));
  $("#dayCompanion").innerHTML = `<div class="companion-progress"><span style="width:${items.length ? completedActive/items.length*100 : 0}%"></span></div><article class="companion-card"><div class="companion-now"><p class="eyebrow">TERAZ · PUNKT ${index+1} Z ${items.length}</p><h3>${escapeHtml(current.name)}</h3><p>${escapeHtml(current.description)}</p><div class="companion-facts"><span><small>PLANOWO</small><b>${escapeHtml(current.time)}</b></span><span><small>NA MIEJSCU</small><b>${current.duration} min</b></span><span><small>ADRES</small><b>${escapeHtml(current.address)}</b></span></div>${booking ? `<div class="companion-alert"><b>Tu potrzebujesz rezerwacji godzinowej</b><span>${escapeHtml(booking.when)} · ${escapeHtml(booking.price)}</span></div>` : ""}<div class="companion-actions"><a class="button primary" href="${mapsUrl(current.coordinates)}" target="_blank" rel="noopener">Prowadź mnie tutaj</a><button class="button quiet" data-action="done" data-id="${current.id}">Gotowe — pokaż następny krok</button></div></div><aside class="companion-next">${upcoming && leg ? `<p class="card-label">NASTĘPNY KROK</p><span class="leg-mode">${modeIcon(leg.mode)}</span><h4>${escapeHtml(upcoming.name)}</h4><div class="leg-numbers"><b>${leg.minutes} min</b><span>${escapeHtml(leg.distance)}</span></div><p>${leg.approximate ? "Szacunkowy spacer w skróconym wariancie." : `${escapeHtml(leg.mode)} — przewodnik zachowuje właściwą kolejność.`}</p><a href="${segmentUrl(current,upcoming,leg)}" target="_blank" rel="noopener">${leg.mode.includes("autobus") ? "Sprawdź przejazd" : "Otwórz ten spacer"}</a>${leg.mode.includes("autobus") ? `<a href="${routeUrl([current.coordinates,upcoming.coordinates])}" target="_blank" rel="noopener">Wolę iść pieszo</a>` : ""}` : `<p class="card-label">PO TYM PUNKCIE</p><span class="leg-mode">FINAŁ</span><h4>${current.next?.distance === "powrót autobusem" ? "Wróć autobusem do centrum" : "To ostatni punkt dnia"}</h4><p>${current.next?.distance === "powrót autobusem" ? "Sprawdź najbliższe połączenie w Mapach Google — rozkład zależy od dnia i godziny." : "Oznacz go jako gotowy, a zapiszę cały dzień jako ukończony."}</p>`}</aside></article><div class="companion-overview"><span><b>${stats.done}/${stats.total}</b> miejsc całego dnia</span><span><b>${escapeHtml(selected.distance)}</b> łącznie</span><a href="${routeUrl(items.map(item => item.coordinates))}" target="_blank" rel="noopener">Cała trasa w Google Maps</a></div>`;
}

function renderTimeline() {
  const selected = day();
  const ids = activeIds(selected);
  const items = ids.map(place).filter(Boolean);
  $("#timeline").innerHTML = items.map((item, index) => {
    if (isDemoLocked(item, index)) return `<article class="place-card demo-lock" data-order="${index + 1}"><h3>Dalsza część trasy premium</h3><p>W wersji demo widzisz początek dnia i sposób prowadzenia. Pełny produkt zawiera wszystkie dni, warianty i mapy.</p><a class="button primary" href="${data.guide.demo.ctaUrl}">Zapytaj o przewodnik</a></article>`;
    const status = pointStatus(state,item.id), done = status === "DONE", skipped = status === "SKIPPED", saved = state.saved.includes(item.id);
    const following = items[index + 1];
    const leg = legInfo(item,following);
    return `<article class="place-card ${done ? "is-done" : skipped ? "is-skipped" : currentPlace()?.id === item.id ? "is-current" : ""}" data-order="${index + 1}" id="place-${item.id}"><details ${currentPlace()?.id === item.id ? "open" : ""}><summary class="place-head"><div><span class="card-label">${done ? "UKOŃCZONE" : skipped ? "POMINIĘTE" : currentPlace()?.id === item.id ? "TERAZ" : scheduleLabel(item.scheduleType)} / ${escapeHtml(item.address)}</span><h3>${escapeHtml(item.name)}</h3></div><div class="place-time">${escapeHtml(item.time)}<small>${item.duration} min · ${escapeHtml(item.price)}</small></div></summary><div class="photo-slot"><span>${escapeHtml(item.photo || "punkt praktyczny: bez zdjęcia")}</span></div><div class="place-body"><p>${escapeHtml(item.description)}</p>${item.openingNote ? `<div class="opening-note"><b>Godziny i ograniczenia</b><span>${escapeHtml(item.openingNote)}</span></div>` : ""}<div class="place-details"><div class="detail"><b>Dlaczego warto</b>${escapeHtml(item.why)}</div><div class="detail"><b>Nie przegap</b>${escapeHtml(item.dontMiss || "To punkt praktyczny na trasie.")}</div></div><div class="tip"><b>Martyna podpowiada:</b> ${escapeHtml(item.tip)}</div>${item.warning ? `<div class="tip warning"><b>Uważaj:</b> ${escapeHtml(item.warning)}</div>` : ""}<div class="place-actions"><a href="${mapsUrl(item.coordinates)}" target="_blank" rel="noopener">Prowadź mnie</a>${item.officialUrl ? `<a href="${item.officialUrl}" target="_blank" rel="noopener">Oficjalna strona</a>` : ""}${item.ticketUrl ? `<a href="${item.ticketUrl}" target="_blank" rel="noopener">Bilety</a>` : ""}<button class="done ${done ? "is-active" : ""}" data-action="done" data-id="${item.id}">${done ? "Ukończone" : "Oznacz jako odwiedzone"}</button><button class="save ${saved ? "is-active" : ""}" data-action="save" data-id="${item.id}" aria-label="${saved ? "Usuń z zapisanych" : "Zapisz miejsce"}">${saved ? "Zapisane" : "Zapisz"}</button></div></div></details>${following && leg ? `<div class="next-leg"><span><b>${modeIcon(leg.mode)}</b> Dalej: ${escapeHtml(following.name)}</span><span>${leg.minutes} min · ${escapeHtml(leg.distance)} · ${escapeHtml(leg.mode)}</span><a href="${segmentUrl(item,following,leg)}" target="_blank" rel="noopener">Trasa</a></div>` : ""}</article>`;
  }).join("");
  $$("#timeline .card-label").forEach((node) => {
    node.textContent = node.textContent.replace(/^\s*\/\s*/, "");
  });
}

function restaurantsOnRoute() { const ids = new Set(day().placeIds); return data.restaurants.filter(item => ids.has(item.stage) && (!state.foodVegetarian || item.vegetarian)); }
function renderFood() {
  $("#foodSection").innerHTML = `<p class="eyebrow">JEDZENIE NA TRASIE</p><h2>Przerwa na trasie: dzień ${escapeHtml(day().number)}</h2><div class="filter-row"><button class="${!state.foodVegetarian ? "is-active" : ""}" data-action="food-filter" data-value="all">Wszystkie</button><button class="${state.foodVegetarian ? "is-active" : ""}" data-action="food-filter" data-value="veg">Tylko wege</button></div><div class="food-grid">${restaurantsOnRoute().map(item => `<article class="food-card"><span class="status-pill">${escapeHtml(item.category)} · ${escapeHtml(item.price)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.note)}</p><p><b>Zamów:</b> ${escapeHtml(item.order)}</p><p class="food-current">Sprawdź dzisiejsze godziny przed wyjściem.</p><a href="${item.maps}" target="_blank" rel="noopener">Otwórz w Google Maps</a></article>`).join("") || "<p>Brak lokali spełniających filtr na tym odcinku.</p>"}</div>`;
}
function renderExtras() {
  $("#extraSections").innerHTML = `<article class="utility-card"><span class="card-label">0 €</span><h3>Najlepsze rzeczy za darmo</h3>${data.guide.free.map(item => `<p>• ${escapeHtml(item)}</p>`).join("")}</article><article class="utility-card"><span class="card-label">Rzymskie smaki</span><h3>Tego spróbuj</h3>${data.guide.flavours.map(([name, desc]) => `<p><b>${escapeHtml(name)}</b><br>${escapeHtml(desc)}</p>`).join("")}</article><article class="utility-card"><span class="card-label">Bez straszenia</span><h3>Tego lepiej nie robić</h3>${data.guide.mistakes.map(item => `<p>• ${escapeHtml(item)}</p>`).join("")}</article>`;
}
function renderPlan() { renderDaySwitcher(); renderDayOverview(); renderDayCompanion(); renderTimeline(); renderFood(); renderExtras(); decoratePlaces(); }

function decoratePlaces() {
  const items = activePlaces(), current = currentPlace();
  const index = current ? items.findIndex(item => item.id === current.id) : items.length;
  const previous = items[index-1];
  $("#dayCompanion").insertAdjacentHTML("beforeend", `<div class="route-controls">${previous ? `<button class="button quiet" data-action="resume-point" data-id="${previous.id}">← Wróć: ${escapeHtml(previous.name)}</button>` : ""}<button class="button quiet" data-action="restart-day">Zacznij dzień od nowa</button></div>`);
  if (current && editorialVisuals.has(current.id)) $(".companion-now").insertAdjacentHTML("afterbegin", `<button class="place-preview companion-place-preview" data-action="open-place" data-id="${current.id}" aria-label="Otwórz kartę: ${escapeHtml(current.name)}">${placeVisual(current)}<span>Otwórz pełną kartę miejsca ↗</span></button>`);
  $$("#timeline .place-card:not(.demo-lock)").forEach(node => {
    const item = place(node.id.slice(6));
    const summary = $("summary",node);
    summary.dataset.action = "open-place"; summary.dataset.id = item.id;
    if (editorialVisuals.has(item.id)) node.insertAdjacentHTML("afterbegin", `<button class="point-image-frame place-preview" data-action="open-place" data-id="${item.id}" aria-label="Otwórz kartę: ${escapeHtml(item.name)}">${placeVisual(item)}<span>Zobacz miejsce ↗</span></button>`);
    $(".photo-slot",node)?.remove();
  });
}

function openPlace(id, push = true) {
  const item = place(id); if (!item) return;
  if (demoMode && !data.guide.demo.unlockedDays.some(dayId => item.dayIds.includes(dayId))) return;
  let dialog = $("#placeDialog");
  if (!dialog) {
    dialog = document.createElement("dialog"); dialog.id="placeDialog"; dialog.className="rome-place-dialog";
    dialog.setAttribute("aria-labelledby","placeTitle"); document.body.append(dialog);
    dialog.addEventListener("cancel", event => {event.preventDefault(); closePlace();});
  }
  const route = activePlaces(), index = route.findIndex(point => point.id === id), next = index >= 0 ? route[index+1] : null;
  const leg = next && legInfo(item,next);
  dialog.dataset.id=id;
  const publicScheduleLabel = scheduleLabel(item.scheduleType,item);
  dialog.innerHTML=`<header class="place-toolbar"><button class="button quiet" data-action="close-place">← Wróć do przewodnika</button><button class="button quiet" data-action="close-place" aria-label="Zamknij kartę">×</button></header><div class="place-editorial"><div class="place-cover">${placeVisual(item)}</div><div class="place-intro"><p class="eyebrow">RZYM · ${scheduleLabel(item.scheduleType)}</p><h2 id="placeTitle">${escapeHtml(item.name)}</h2><p>${escapeHtml(item.why)}</p><div class="place-fact-grid">${[["Na miejscu",`${item.duration} min`],["Koszt",item.price],["Adres",item.address],["Rezerwacja",item.bookingRequired ? "Zarezerwuj wcześniej" : "Sprawdź warunki na oficjalnej stronie"]].map(([label,value])=>`<div><small>${label}</small><strong>${escapeHtml(value)}</strong></div>`).join("")}</div><div class="place-actions"><a class="button primary" href="${mapsUrl(item.coordinates)}" target="_blank" rel="noopener">Prowadź mnie</a>${item.ticketUrl ? `<a class="button quiet" href="${item.ticketUrl}" target="_blank" rel="noopener">Bilety</a>` : ""}<button class="button quiet" data-action="save" data-id="${id}">${state.saved.includes(id)?"Usuń z zapisanych":"Zapisz miejsce"}</button></div></div></div><div class="place-reading"><section><h3>Jak zwiedzać</h3><p>${escapeHtml(item.description)}</p>${item.openingNote?`<h3>Godziny i ograniczenia</h3><p>${escapeHtml(item.openingNote)}</p>`:""}<h3>Nie przegap</h3><p>${escapeHtml(item.dontMiss || item.why)}</p><div class="tip"><b>Martyna podpowiada</b><p>${escapeHtml(item.tip)}</p></div>${item.warning?`<div class="tip warning"><b>Warto wiedzieć</b><p>${escapeHtml(item.warning)}</p></div>`:""}</section><aside><h3>Praktycznie</h3><p>Godzina w planie: ${escapeHtml(item.time)}. Pierwszeństwo ma godzina Twojej rezerwacji.</p>${item.officialUrl?`<a href="${item.officialUrl}" target="_blank" rel="noopener">Sprawdź godziny i zasady na oficjalnej stronie ↗</a>`:""}<p class="source-line">Sprawdzone ${escapeHtml(verified(item))} · <a href="${item.sourceUrl}" target="_blank" rel="noopener">Źródło</a></p>${next&&leg?`<h3>Dalej: ${escapeHtml(next.name)}</h3><p>${leg.minutes} min · ${escapeHtml(leg.distance)} · ${escapeHtml(leg.mode)}</p><a href="${segmentUrl(item,next,leg)}" target="_blank" rel="noopener">Trasa do następnego punktu ↗</a><button class="button quiet" data-action="open-place" data-id="${next.id}">Karta następnego miejsca</button>`:""}</aside></div>${id==="colosseum"?`<div class="place-gallery"><img src="assets/places/colosseum-interior.jpg" alt="Wnętrze Koloseum i podziemia areny" loading="lazy"><img src="assets/places/colosseum-night.jpg" alt="Podświetlone Koloseum nocą" loading="lazy"></div>`:""}<footer class="place-footer"><button class="button primary" data-action="done" data-id="${id}">${state.done.includes(id)?"Cofnij oznaczenie jako odwiedzone":"Oznacz jako odwiedzone"}</button>${index>=0?`<button class="button quiet" data-action="resume-point" data-id="${id}">Kontynuuj od tego miejsca</button>`:""}</footer>`;
  $(".place-intro .eyebrow",dialog).textContent = publicScheduleLabel ? `RZYM · ${publicScheduleLabel}` : "RZYM";
  if(push) { const url=new URL(location.href); url.searchParams.set("place",id); history.pushState({romePlace:true},"",url); }
  if(!dialog.open) dialog.showModal();
  dialog.scrollTop=0;
}
function closePlace() {
  $("#placeDialog")?.close();
  const url=new URL(location.href); url.searchParams.delete("place"); history.replaceState(null,"",url);
}

function markerColor(item) { return ({attraction:"#9a543b",viewpoint:"#17243b",food:"#73806b",toilet:"#4f7585",water:"#4f7585",transport:"#665c52",optional:"#8a7a64",rest:"#73806b"})[item.category] || "#17243b"; }
function mapItems() {
  const places = data.places.filter(item => state.mapDay === "all" || item.dayIds.includes(state.mapDay));
  const mapRoute = data.days.find(item => item.id === state.mapDay);
  const foods = data.restaurants.filter(item => (state.mapDay === "all" || mapRoute?.placeIds.includes(item.stage)) && (!state.foodVegetarian || item.vegetarian)).map(item => ({...item, category:"food", description:item.note}));
  return [...places, ...foods].filter(item => state.mapCategory === "all" || item.category === state.mapCategory);
}
function renderMap() {
  if (!navigator.onLine || !window.L) { document.body.classList.add("offline"); renderMapFallback(); return; }
  document.body.classList.remove("offline");
  if (!map) {
    map = L.map("romeMap", { zoomControl:true, preferCanvas:true }).setView([41.895,12.482],13);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom:19, attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' }).addTo(map);
  }
  if (mapLayer) map.removeLayer(mapLayer);
  mapLayer = L.layerGroup().addTo(map);
  const items = mapItems();
  const bounds = [];
  items.forEach((item, index) => {
    const icon = L.divIcon({ className:"", html:`<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:50%;background:${markerColor(item)};color:white;border:2px solid white;font:700 12px Arial;box-shadow:0 2px 8px #0004">${item.category === "food" ? "F" : index + 1}</span>`, iconSize:[30,30], iconAnchor:[15,15] });
    L.marker(item.coordinates,{icon}).bindPopup(`<h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description || item.note)}</p>${place(item.id)?`<button data-action="open-place" data-id="${item.id}">Otwórz kartę miejsca</button><br>`:""}<a href="${mapsUrl(item.coordinates)}" target="_blank" rel="noopener">Prowadź mnie</a>`).addTo(mapLayer); bounds.push(item.coordinates);
  });
  const mapRouteDay = data.days.find(item => item.id === state.mapDay);
  const route = (mapRouteDay && (state.mapCategory === "all" || state.mapCategory === "attraction") ? activePlaces(mapRouteDay) : []).map(item => item.coordinates);
  if (route.length > 1) L.polyline(route,{color:"#17243b",weight:3,dashArray:"8 7"}).addTo(mapLayer);
  if (bounds.length) map.fitBounds(bounds,{padding:[24,24],maxZoom:15});
  setTimeout(() => map.invalidateSize(), 100);
}
function renderMapFilters() {
  const categories = [["all","Wszystko"],["attraction","Atrakcje"],["food","Jedzenie"],["viewpoint","Widoki"],["water","Woda"],["toilet","Toalety"],["transport","Transport"],["rest","Odpoczynek"],["optional","Opcjonalne"]];
  $("#mapFilters").innerHTML = [`<button class="${state.mapDay === "all" ? "is-active" : ""}" data-action="map-day" data-id="all">Cały Rzym</button>`, ...data.days.map(item => `<button class="${state.mapDay === item.id ? "is-active" : ""}" data-action="map-day" data-id="${item.id}">${item.number}</button>`), ...categories.map(([id,label]) => `<button class="${state.mapCategory === id ? "is-active" : ""}" data-action="map-category" data-id="${id}">${label}</button>`), `<button class="${state.foodVegetarian ? "is-active" : ""}" data-action="food-filter" data-value="veg">Tylko wege</button>`].join("");
}
function renderMapFallback() { $("#mapFallback").innerHTML = `<h3>Mapa jest offline</h3><p>Kafelków OpenStreetMap nie zapisujemy hurtowo. Nadal masz kolejność, adresy i linki, które zadziałają po odzyskaniu internetu.</p>${activePlaces().map((item,index) => `<p><b>${index+1}. ${escapeHtml(item.name)}</b><br>${escapeHtml(item.address)}</p>`).join("")}`; }

function renderMyRome() {
  const profile = tripProfile();
  const summary = $("#tripSummary");
  const checklist = $("#pretripChecklist");
  if (!summary || !checklist) return;
  if (!profile.configured) {
    summary.innerHTML = `<article class="trip-empty"><p class="eyebrow">MÓJ RZYM</p><h2>Plan, który zna Twoje bilety.</h2><p>Dodaj tylko to, co już wiesz. Żadne pole z biletem nie jest obowiązkowe.</p><button class="button primary" data-action="open-trip">Dopasuj mój Rzym</button></article>`;
    checklist.innerHTML = "";
    return;
  }
  const ids = tripPlanDayIds(profile);
  summary.innerHTML = `<article class="trip-summary"><header><div><p class="eyebrow">MÓJ RZYM</p><h2>${escapeHtml(tripDateRange(profile))}</h2><p>${profile.accommodationName || profile.accommodationAddress ? `Nocleg: ${escapeHtml(profile.accommodationName || profile.accommodationAddress)}` : "Nocleg możesz dodać później."}</p><small>Dane Twojego wyjazdu są zapisywane tylko na tym urządzeniu.</small></div><button class="button quiet" data-action="open-trip">EDYTUJ WYJAZD</button></header><div class="my-days">${ids.map((id,index) => {
    const selected = data.days.find(item => item.id === id); const meta=dayMeta[id];
    return `<article><span>DZIEŃ ${index+1}</span><h3>${escapeHtml(selected.title)}</h3><p>${escapeHtml(selected.subtitle)}</p><div><small>${dayStart(selected)}–${escapeHtml(meta.end.replace("około ",""))}</small><small>${escapeHtml(selected.distance)}</small><small>${money(dayCost(selected))}</small></div><strong>${escapeHtml(tripAnchor(selected))}</strong><button class="text-button" data-action="day-today" data-id="${id}">Otwórz dzień →</button></article>`;
  }).join("")}</div><button class="text-button danger" data-action="delete-trip-data">USUŃ DANE WYJAZDU</button></article>`;
  const colosseumPolicy=admissionPolicy("colosseum",state.tripDates?.["day-1"],{slot:state.anchorSlots?.colosseum});
  const vaticanStatus=vaticanMuseumStatus(state.tripDates?.["day-2"]);
  const prep = [
    {label:colosseumPolicy.ticketMethod==="on_site" ? "Koloseum — darmowy wstęp, bilet odbierzesz na miejscu" : "Koloseum — dodaj godzinę biletu",done:colosseumPolicy.ticketMethod==="on_site" || Boolean(state.anchorSlots?.colosseum),id:"colosseum",detail:colosseumPolicy.ticketMethod==="on_site" ? "bez standardowego slotu online" : ""},
    {label:!vaticanStatus.open ? "Muzea Watykańskie są zamknięte — zmień dzień" : vaticanStatus.mode==="last_sunday" ? "Muzea Watykańskie — specjalny darmowy tryb" : "Muzea Watykańskie — dodaj godzinę biletu",done:vaticanStatus.mode==="last_sunday" || vaticanStatus.open && Boolean(state.anchorSlots?.["vatican-museums"]),id:"vatican-museums",detail:!vaticanStatus.open ? vaticanStatus.reason : vaticanStatus.mode==="last_sunday" ? "09:00–14:00, ostatnie wejście 12:30" : ""},
    ...(state.anchorSlots?.["borghese-gallery"] ? [{label:"Galleria Borghese — rezerwacja",done:true,id:"borghese-gallery"}] : []),
    ...(state.anchorSlots?.["catacombs-san-sebastiano"] ? [{label:"Katakumby — rezerwacja",done:true,id:"catacombs-san-sebastiano"}] : []),
    ...(state.anchorSlots?.["st-peter-dome"] ? [{label:"Kopuła św. Piotra — sprawdź trasę biletu",done:profile.domeRoute!=="unknown",id:"st-peter-dome",detail:profile.domeRoute==="unknown" ? "sprawdź w mailu: Sobieski czy Lambertini" : `${state.anchorSlots["st-peter-dome"]} · ${profile.domeRoute}`} ] : []),
    ...(profile.airport !== "none" ? [{label:"Wybierz transfer z lotniska",done:true,id:"airport"}] : []),
    {label:"Wpisz adres noclegu",done:Boolean(profile.accommodationAddress || profile.accommodationName),id:"hotel"}
  ];
  const complete = prep.filter(item => item.done).length;
  checklist.innerHTML = `<p class="eyebrow">PRZED WYJAZDEM</p><div class="checklist-title"><h2>${complete} / ${prep.length} gotowe</h2><div class="progress-track"><i style="width:${complete/prep.length*100}%"></i></div></div><div class="pretrip-list">${prep.map(item => {
    const ticket=ticketFor(item.id);
    const editLabel = item.done ? "ZMIEŃ" : ["airport","hotel"].includes(item.id) ? "UZUPEŁNIJ" : "DODAJ GODZINĘ";
    return `<article class="${item.done ? "is-done" : ""}"><span aria-hidden="true">${item.done ? "✓" : "○"}</span><div><b>${escapeHtml(item.label)}</b>${item.done || item.detail ? `<small>${escapeHtml(item.detail || (item.id === "hotel" ? profile.accommodationName || profile.accommodationAddress : item.id === "airport" ? (profile.airport === "FCO" ? "Fiumicino" : "Ciampino") : state.anchorSlots[item.id]))}</small>` : ""}</div>${["airport","hotel"].includes(item.id) ? `<button class="mini-button" data-action="open-trip">${editLabel}</button>` : `<div class="pretrip-actions"><button class="mini-button" data-action="open-trip">${editLabel}</button>${ticket?.ticketUrl && item.id!=="colosseum" || ticket?.ticketUrl && colosseumPolicy.ticketMethod!=="on_site" ? `<a href="${ticket.ticketUrl}" target="_blank" rel="noopener">KUP OFICJALNY BILET <small>· internet</small></a>` : ""}</div>`}</article>`;
  }).join("")}</div>`;
}

function rescuePreview(kind,value) {
  const selected=day(); const ids=activeIds(selected); const current=currentPlace(); const currentIndex=Math.max(0,ids.indexOf(current?.id));
  const result=adaptRoute({ids,places:data.places,situation:kind,level:value,delayMinutes:Number(value)||0,currentIndex,nowMinutes:parsePlaceTime(current || place(ids[0])),closingMinutes,rainIds:selected.rainIds,essentialIds:dayMeta[selected.id]?.essential || []});
  const names=list=>list.map(id=>place(id)?.name).filter(Boolean).join(", ");
  let message="";
  if(kind==="delay") message=`Jesteś około ${value} min za planem. ${names(result.hardAnchors) || "Rezerwacje godzinowe"} zostaje bez zmian.${result.removed.length ? ` Pomijamy: ${names(result.removed)}.` : " Reszta trasy nadal się mieści."}${result.shortened.length ? ` Skracamy ${names(result.shortened)} o około 15 min.` : ""}`;
  if(kind==="tired") message=value==="strong" ? `Zostawiam najważniejszą oś dnia i wszystkie rezerwacje godzinowe. Pomijamy: ${names(result.removed) || "dodatkowe punkty"}.${selected.id==="day-3" ? " Dzień kończy się spokojnie w Trastevere." : ""}` : `Odejmuję 1–2 mniej ważne, elastyczne punkty: ${names(result.removed) || "na razie nic"}. Rezerwacje godzinowe zostają.`;
  if(kind==="rain") message=`Ograniczam długie odcinki na zewnątrz i układam dzień wokół miejsc pod dachem. Rezerwacje godzinowe zostają.${result.removed.length ? ` Pomijamy: ${names(result.removed)}.` : ""}`;
  const baseMatch=String(dayMeta[selected.id]?.end || "").match(/(\d{1,2}):(\d{2})/);
  const baseEnd=baseMatch ? Number(baseMatch[1])*60+Number(baseMatch[2]) : 17*60;
  const delta=kind==="delay" ? Number(value || 0)-result.savedMinutes : -result.savedMinutes;
  const end=Math.max(0,baseEnd+delta); const newEnd=`${String(Math.floor(end/60)).padStart(2,"0")}:${String(end%60).padStart(2,"0")}`;
  return {...result,kind,value,message:`${message} Nowy koniec dnia: około ${newEnd}.`,newEnd};
}

function openRescue(kind) {
  const dialog=$("#rescueDialog");
  const choices=kind==="delay" ? [[15,"+15 min"],[30,"+30 min"],[60,"+60 min"],[90,"więcej"]] : kind==="tired" ? [["light","Lekko"],["strong","Mocno"]] : [["rain","Dopasuj plan"]];
  dialog.dataset.kind=kind;
  dialog.innerHTML=`<form method="dialog"><button class="sheet-close" type="button" data-action="close-rescue" aria-label="Zamknij">×</button><p class="eyebrow">RATUJEMY DZIEŃ</p><h2>${kind==="delay" ? "O ile się spóźniasz?" : kind==="tired" ? "Jak bardzo jesteś zmęczona?" : "Pada? Skróćmy plener."}</h2><div class="rescue-choices">${choices.map(([id,label])=>`<button type="button" class="button quiet" data-action="preview-rescue" data-value="${id}">${label}</button>`).join("")}</div><div id="rescuePreview" aria-live="polite"></div></form>`;
  dialog.showModal();
  if(kind==="rain") showRescuePreview("rain");
}
function showRescuePreview(value) {
  adjustmentPreview=rescuePreview($("#rescueDialog").dataset.kind,value);
  $("#rescuePreview").innerHTML=`<article><p>${escapeHtml(adjustmentPreview.message)}</p><div class="today-actions"><button type="button" class="button primary" data-action="apply-rescue">ZASTOSUJ ZMIANY</button><button type="button" class="button quiet" data-action="close-rescue">ZOSTAW PLAN</button></div></article>`;
}
function applyRescue() {
  if(!adjustmentPreview)return;
  const selected=day();
  update(s=>applyRouteAdjustment(s,selected.id,adjustmentPreview));
  $("#rescueDialog").close(); adjustmentPreview=null; renderAll(); setView("today"); toast("Plan dnia został bezpiecznie skrócony");
}

function renderSaved() {
  renderMyRome();
  const total = data.days.reduce((sum,item) => sum + item.placeIds.length,0);
  const completed = new Set(state.done).size;
  const percent = Math.round(completed/total*100);
  $("#passport").innerHTML = `<article class="passport-card"><div class="passport-top"><div><p class="eyebrow">POSTĘP</p><h2>${completed} z ${total} miejsc</h2><p>${data.days.filter(item => progress(item).percent === 100).length} ukończonych dni · plan na dziś: ${escapeHtml(day().title)}</p></div><div class="progress-ring" style="--progress:${percent}%"><b>${percent}%</b></div></div></article>`;
  const saved = state.saved.map(place).filter(Boolean);
  queueMicrotask(() => $$("#savedPlaces .saved-item").forEach((node,index) => {
    const item=saved[index]; if(!item)return;
    node.insertAdjacentHTML("afterbegin",`<button class="button quiet" data-action="open-place" data-id="${item.id}" aria-label="Otwórz kartę: ${escapeHtml(item.name)}">Zobacz ↗</button>`);
  }));
  $("#savedPlaces").innerHTML = `<p class="eyebrow">ZAPISANE</p><h2>Chcę tu wrócić</h2><div class="saved-list">${saved.map(item => `<div class="saved-item"><span><b>${escapeHtml(item.name)}</b><br><small>${escapeHtml(item.address)}</small></span><button class="text-button" data-action="save" data-id="${item.id}">Usuń</button></div>`).join("") || "<p>Na razie nic tu nie ma. Zapisuj miejsca z kart trasy.</p>"}</div>`;
  $("#checklist").innerHTML = `<p class="eyebrow">PRZED WYJAZDEM</p><h2>Checklista</h2><div class="check-list">${data.guide.checklist.map((item,index) => `<label><input type="checkbox" data-action="check" data-id="${index}" ${state.checklist[index] ? "checked" : ""}><span>${escapeHtml(item)}</span></label>`).join("")}</div>`;
  renderBudget();
}
function renderBudget() {
  const total = state.expenses.reduce((sum,item) => sum + Number(item.amount),0);
  const left = Number(state.budgetLimit || 0) - total;
  $("#budget").innerHTML = `<p class="eyebrow">BUDŻET</p><h2>Wydatki bez arkusza</h2><div class="budget-summary"><div><span>Budżet</span><b>${money(state.budgetLimit)}</b></div><div><span>Wydane</span><b>${money(total)}</b></div><div><span>Zostało</span><b>${money(left)}</b></div></div><form class="budget-form" id="budgetForm"><input name="label" required maxlength="50" placeholder="np. Koloseum"><input name="amount" required min="0" step="0.01" type="number" placeholder="€"><button class="button primary">Dodaj</button></form><label class="budget-entry">Mój budżet: <input id="budgetLimit" type="number" min="0" step="1" value="${state.budgetLimit || ""}" placeholder="300"> €</label><div>${state.expenses.map((item,index) => `<div class="budget-entry"><span>${escapeHtml(item.label)}</span><b>${money(item.amount)}</b><button class="text-button" data-action="expense-remove" data-index="${index}">Usuń</button></div>`).join("")}</div>`;
}

const scenarios = {
  delay:["Mam opóźnienie","Zostaw wejście godzinowe. Pomijam punkty opcjonalne i najdłuższy objazd."],
  two:["Mam tylko 2 godziny","Dostajesz rdzeń aktualnego dnia, bez wnętrz wymagających kolejnego biletu."],
  four:["Mam 4 godziny","Rdzeń plus jeden widok i posiłek dokładnie przy trasie."],
  tired:["Jestem zmęczona","Ograniczam podejścia i liczbę punktów. Powrót ustawiam przy metrze lub głównym węźle."],
  rain:["Pada deszcz","Zamieniam spacer na miejsca pod dachem w tej samej części miasta."],
  noTicket:["Nie mam biletu","Pokazuję bezpłatne zewnętrzne odpowiedniki i nie próbuję kupować wejścia od ulicznego pośrednika."],
  hungry:["Jestem głodna","Tylko jedzenie po drodze, nie ranking z drugiego końca miasta."],
  lost:["Zgubiłam trasę","Wracamy do aktualnego punktu i otwieramy prowadzenie."],
  hotel:["Wracam do hotelu","Otwórz trasę do zapisanego adresu hotelu w Mapach Google."],
  termini:["Wracam na Termini","Najkrótsze aktualne połączenie sprawdź w mapie, bo komunikacja zmienia się na żywo."],
  airport:["Jadę na lotnisko","Wybierz lotnisko i kieruj się oficjalnym połączeniem, nie przypadkową ofertą transportu."],
  heat:["Jest bardzo gorąco","Zewnętrzne odcinki przenieś przed 10:30 i po 17:00. W środku dnia wybierz miejsce pod dachem i dłuższy odpoczynek."]
};
function renderHelp() {
  const order = ["delay","two","four","tired","rain","noTicket","hungry","lost","hotel","termini","airport"];
  $("#scenarioGrid").innerHTML = order.map(key => `<button data-action="scenario" data-scenario="${key}"><b>${scenarios[key][0]}</b><small>${scenarios[key][1]}</small></button>`).join("");
  renderPhrases("restauracja");
  $("#emergency").innerHTML = `<p class="eyebrow">WAŻNE</p><h2>${data.emergency.number}: ${escapeHtml(data.emergency.label)}</h2><p>${escapeHtml(data.emergency.note)}</p><div class="today-actions"><a href="tel:${data.emergency.number}" class="button primary">Zadzwoń pod ${data.emergency.number}</a><a href="mailto:${data.emergency.contact.email}">Napisz do Martyny</a><a href="${data.emergency.contact.instagram}" target="_blank" rel="noopener">Instagram</a></div><div class="source-line">Zweryfikowano ${data.emergency.lastVerified} · <a href="${data.emergency.sourceUrl}" target="_blank" rel="noopener">źródło</a></div>`;
}
function scenarioResult(key) {
  setView("help"); const selected = day(); let body = "";
  if (["delay","two","four","tired","rain","heat"].includes(key)) {
    if (key === "rain") persist({mode:"rain"}); else if (key === "tired") persist({mode:"tired"}); else if (["delay","two"].includes(key)) persist({mode:"quick"});
    const list = activePlaces(selected).slice(0,key === "two" ? 3 : key === "four" ? 5 : undefined);
    body = `<p>${escapeHtml(scenarios[key][1])}</p><ol>${list.map(item => `<li><b>${escapeHtml(item.name)}</b> · ${item.duration} min</li>`).join("")}</ol><button class="button primary" data-action="view" data-view="plan">Pokaż zmieniony timeline</button>`;
  } else if (key === "noTicket") {
    const alternatives = selected.id === "day-2" ? ["st-peter-square","ponte-santangelo","piazza-navona"] : selected.id === "day-1" ? ["arch-constantine","fori-imperiali","forum-view","vittoriano"] : selected.quickIds;
    body = `<p>Nie kupuj biletu od osoby zaczepiającej przed wejściem. Zobacz teraz:</p><ol>${alternatives.map(id => `<li>${escapeHtml(place(id)?.name)}</li>`).join("")}</ol><p>Oficjalny sklep sprawdzisz później w sekcji rezerwacji.</p>`;
  } else if (key === "hungry") {
    body = `<p>Te miejsca nie cofają Cię z aktualnej trasy:</p>${restaurantsOnRoute().slice(0,4).map(item => `<p><b>${escapeHtml(item.name)}</b> · ${escapeHtml(item.category)} · ${escapeHtml(item.note)} <a href="${item.maps}" target="_blank" rel="noopener">Mapa</a></p>`).join("")}`;
  } else if (key === "lost") {
    const current = currentPlace() || data.places[0]; body = `<p>Aktualny punkt to <b>${escapeHtml(current?.name)}</b>.</p><a class="button primary" href="${mapsUrl(current.coordinates)}" target="_blank" rel="noopener">Prowadź mnie tutaj</a>`;
  } else if (key === "termini") body = `<a class="button primary" href="${data.transport.back.termini}" target="_blank" rel="noopener">Trasa na Termini</a>`;
  else if (key === "airport") body = `<p><b>Fiumicino:</b> Leonardo Express do Termini albo FL1 do Trastevere/Ostiense/Tiburtina.</p><p><b>Ciampino:</b> autobus do Termini albo 520/720 do metra.</p><div class="today-actions"><a href="${data.transport.back.fco}" target="_blank" rel="noopener">Fiumicino</a><a href="${data.transport.back.cia}" target="_blank" rel="noopener">Ciampino</a></div>`;
  else if (key === "hotel") body = `<p>Przewodnik nie zapisuje adresu hotelu bez Twojej decyzji. Wpisz go jako cel w Google Maps i zapisz offline przed wyjściem.</p><a class="button primary" href="https://www.google.com/maps/dir/?api=1&travelmode=transit" target="_blank" rel="noopener">Otwórz trasę</a>`;
  const node = $("#helpResult"); node.classList.add("has-content"); node.innerHTML = `<h3>${escapeHtml(scenarios[key][0])}</h3>${body}`;
  renderToday(); renderPlan();
}
function renderPhrases(active) {
  $("#phrases").innerHTML = `<p class="eyebrow">MINI ROZMÓWKI</p><h2>Powiedz to po włosku</h2><div class="phrase-tabs">${Object.keys(data.phrases).map(key => `<button data-action="phrase" data-key="${key}" class="${key === active ? "is-active" : ""}">${escapeHtml(key)}</button>`).join("")}</div><div class="phrase-list">${data.phrases[active].map(([pl,it,say]) => `<article><span>${escapeHtml(pl)}</span><b>${escapeHtml(it)}</b><em>${escapeHtml(say)}</em></article>`).join("")}</div>`;
}

function plannerChoices() {
  for (const [key, options] of Object.entries(data.guide.planner)) {
    const container = $(`[data-choice="${key}"]`);
    container.innerHTML = options.map(([value,label],index) => `<label><input type="${key === "interests" ? "checkbox" : "radio"}" name="${key}" value="${value}" ${index === (key === "duration" ? 3 : key === "pace" ? 1 : 0) && key !== "interests" ? "checked" : ""}><span>${escapeHtml(label)}</span></label>`).join("");
  }
}
function renderTripStep() {
  $$("#tripDialog .trip-step").forEach((node,index)=>node.classList.toggle("is-active",index===tripStep));
  const back=$("#tripDialog [data-action='trip-back']"), next=$("#tripDialog [data-action='trip-next']"), submit=$("#tripDialog [type='submit']");
  back.hidden=tripStep===0; next.hidden=tripStep===3; submit.hidden=tripStep!==3;
}
function openTrip() {
  const profile=tripProfile(); const form=$("#tripForm"); tripStep=0;
  for(const name of ["arrivalDate","departureDate","fullDays","accommodationName","accommodationAddress"]) if(form.elements[name]) form.elements[name].value=profile[name] ?? "";
  for(const name of ["colosseum","vatican-museums","borghese-gallery","catacombs-san-sebastiano","st-peter-dome"]) form.elements[name].value=state.anchorSlots?.[name] || "";
  form.elements.domeRoute.value=profile.domeRoute || "none";
  form.elements.reducedAdmission.checked=profile.reducedAdmission;
  const airport=form.querySelector(`[name="airport"][value="${profile.airport}"]`); if(airport)airport.checked=true;
  const pace=form.querySelector(`[name="tripPace"][value="${profile.pace}"]`); if(pace)pace.checked=true;
  const travel=form.querySelector(`[name="travelType"][value="${profile.travelType}"]`); if(travel)travel.checked=true;
  renderTripStep(); $("#tripDialog").showModal();
}
function saveTrip(form) {
  const values=new FormData(form);
  const profile=normalizeTripProfile({configured:true,arrivalDate:values.get("arrivalDate"),departureDate:values.get("departureDate"),fullDays:values.get("fullDays"),airport:values.get("airport"),accommodationName:values.get("accommodationName"),accommodationAddress:values.get("accommodationAddress"),domeRoute:values.get("domeRoute"),reducedAdmission:values.get("reducedAdmission")==="on",pace:values.get("tripPace"),travelType:values.get("travelType")});
  const slots=Object.fromEntries(["colosseum","vatican-museums","borghese-gallery","catacombs-san-sebastiano","st-peter-dome"].map(id=>[id,String(values.get(id)||"")]));
  const dates=datesForTrip(profile); const selected=dayIdForDate(profile,todayIso()) || tripPlanDayIds(profile)[0];
  persist({tripProfile:profile,tripDates:dates,anchorSlots:slots,routeOptions:{...(state.routeOptions || {}),vaticanDome:Boolean(slots["st-peter-dome"])},arrivalAirport:profile.airport==="none"?null:profile.airport,hotelAddress:profile.accommodationAddress,planner:{duration:String(profile.fullDays),pace:profile.pace==="slow"?"slow":profile.pace==="intense"?"max":"normal",company:profile.travelType==="children"?"family":"solo",interests:[]},dayId:selected,mapDay:selected,mode:"full",routeOverrides:{},transition:null});
  $("#tripDialog").close(); renderAll(); setView("saved"); toast("Mój Rzym jest zapisany na tym urządzeniu");
}
function applyPlanner(form) {
  const values = new FormData(form); const duration = values.get("duration") || "3", pace = values.get("pace") || "normal", company = values.get("company") || "solo", interests = values.getAll("interests");
  let dayId = interests.includes("vatican") ? "day-2" : interests.includes("streets") || interests.includes("food") ? "day-3" : "day-1";
  if (duration === "4" && interests.includes("hidden")) dayId = "day-4b";
  const mode = duration === "hours" || pace === "slow" || company === "mobility" ? "tired" : "full";
  persist({ planner:{duration,pace,company,interests}, dayId, mode });
  renderAll(); toast("Plan dopasowany i zapisany"); setView("today");
}

function renderAll() { renderArrivalJourney(); renderToday(); renderAirportGuide(); renderTicketGuide(); renderReservations(); renderPractical(); renderPlan(); renderMapFilters(); renderMapFallback(); renderSaved(); renderHelp(); }
function bindEvents() {
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-action]"); if (!target) return;
  const action = target.dataset.action;
    if (action === "open-place") { event.preventDefault(); openPlace(target.dataset.id); }
    if (action === "close-place") closePlace();
    if (action === "open-trip") openTrip();
    if (action === "close-trip") $("#tripDialog").close();
    if (action === "trip-back") { tripStep=Math.max(0,tripStep-1); renderTripStep(); }
    if (action === "trip-next") { tripStep=Math.min(3,tripStep+1); renderTripStep(); }
    if (action === "start-day") { persist({startedDays:{...(state.startedDays||{}),[day().id]:true},transition:null}); renderToday(); }
    if (action === "transition-next") { persist({transition:null}); renderToday(); }
    if (action === "finish-day") { persist({transition:null}); renderToday(); }
    if (action === "skip") { const id=target.dataset.id; update(s=>skipPoint(s,day().id,id,activeIds())); renderToday(); renderPlan(); }
    if (action === "open-rescue") openRescue(target.dataset.kind);
    if (action === "toggle-rescue") { const panel=target.closest(".street-card")?.querySelector(".rescue-actions"); if(panel)panel.hidden=!panel.hidden; }
    if (action === "preview-rescue") showRescuePreview(target.dataset.value);
    if (action === "close-rescue") { $("#rescueDialog").close(); adjustmentPreview=null; }
    if (action === "apply-rescue") applyRescue();
    if (action === "undo-rescue") { update(undoRouteAdjustment); renderAll(); setView("today"); toast("Przywrócono poprzedni plan"); }
    if (action === "move-vatican") { const targetId=target.dataset.target; const dates={...(state.tripDates || {})}; [dates["day-2"],dates[targetId]]=[dates[targetId],dates["day-2"]]; persist({tripDates:dates,dismissedNotices:{...(state.dismissedNotices || {}),vaticanMove:true},routeOverrides:{}}); renderAll(); toast("Zmieniono dzień Watykanu"); }
    if (action === "dismiss-vatican-move") { persist({dismissedNotices:{...(state.dismissedNotices || {}),vaticanMove:true}}); renderToday(); }
    if (action === "delete-trip-data" && confirm("Usunąć daty, nocleg i godziny biletów zapisane na tym urządzeniu?")) { persist({tripProfile:{...DEFAULT_TRIP_PROFILE},tripDates:{},anchorSlots:{...defaults.anchorSlots},arrivalAirport:null,hotelAddress:"",routeOverrides:{},adjustments:{},lastAdjustment:null}); renderAll(); toast("Dane wyjazdu zostały usunięte"); }
    if (action === "update-app") { updateRequested=true; if(serviceWorkerRegistration?.waiting) serviceWorkerRegistration.waiting.postMessage({type:"SKIP_WAITING"}); else serviceWorkerRegistration?.update(); }
    if (action === "day-today") { persist({dayId:target.dataset.id,mapDay:target.dataset.id,transition:null}); renderAll(); setView("today"); }
    if (action === "resume-point") { update(s => resumePoint(s,day().id,target.dataset.id)); closePlace(); renderToday(); renderPlan(); setView("plan"); $("#dayCompanion").scrollIntoView({behavior:"smooth"}); }
    if (action === "restart-day") { target.outerHTML='<div class="restart-confirm"><p>Wyzerować postęp tego dnia? Zapisane miejsca i budżet pozostaną bez zmian.</p><button class="button quiet" data-action="confirm-restart">Tak, zacznij od nowa</button><button class="button quiet" data-action="cancel-restart">Anuluj</button></div>'; }
    if (action === "cancel-restart") renderPlan();
    if (action === "confirm-restart") { const selected=day(); const ids=[...new Set([...selected.placeIds,...selected.quickIds,...selected.rainIds,...selected.lowEnergyIds])]; update(s=>resetDay(s,selected.id,ids)); renderToday(); renderPlan(); $("#dayCompanion").scrollIntoView({behavior:"smooth"}); }
    if (action === "view") setView(target.dataset.view);
    if (action === "arrival-start") { setView("journey"); setTimeout(() => $("#arrivalJourney")?.scrollIntoView({behavior:"smooth",block:"start"}),100); }
    if (action === "arrival-airport") { persist({arrivalAirport:target.dataset.airport,arrivalTransfer:null}); renderArrivalJourney(); renderToday(); }
    if (action === "arrival-transfer") { persist({arrivalTransfer:Number(target.dataset.index)}); renderArrivalJourney(); }
    if (action === "arrival-complete") { persist({arrivalComplete:true}); renderArrivalJourney(); renderToday(); setView("plan"); toast("Benvenuta a Roma — wybierz swój dzień"); }
    if (action === "arrival-reset") { persist({arrivalAirport:null,arrivalTransfer:null,arrivalComplete:false}); renderArrivalJourney(); renderToday(); }
    if (action === "continue") { setView("plan"); $(".plan-settings").open = state.dayId.startsWith("day-4"); setTimeout(() => $("#dayCompanion")?.scrollIntoView({behavior:"smooth",block:"start"}),100); }
    if (action === "open-planner") $("#plannerDialog").showModal();
    if (action === "close-planner") $("#plannerDialog").close();
    if (action === "day-main") { const id=target.dataset.day === "4" ? (state.dayId.startsWith("day-4") ? state.dayId : "day-4a") : `day-${target.dataset.day}`; persist({dayId:id,mapDay:id,mode:"full"}); renderAll(); setView("plan"); $(".plan-settings").open = state.dayId.startsWith("day-4"); setTimeout(() => $("#dayCompanion")?.scrollIntoView({behavior:"smooth",block:"start"}),100); }
    if (action === "day") { persist({dayId:target.dataset.id,mapDay:target.dataset.id,mode:"full"}); renderAll(); setView("plan"); $(".plan-settings").open = state.dayId.startsWith("day-4"); setTimeout(() => $("#dayCompanion")?.scrollIntoView({behavior:"smooth",block:"start"}),100); }
    if (action === "map-day") { persist({mapDay:target.dataset.id}); renderMapFilters(); renderMap(); }
    if (action === "map-category") { persist({mapCategory:target.dataset.id}); renderMapFilters(); renderMap(); }
    if (action === "mode") { persist({mode:target.dataset.mode}); renderToday(); renderPlan(); setTimeout(() => $("#dayCompanion")?.scrollIntoView({behavior:"smooth",block:"start"}),100); }
    if (action === "done") { const id=target.dataset.id; const wasDone=state.done.includes(id); const ids=activeIds(); update(s => togglePoint(s,day().id,id,ids)); if(!wasDone && state.view==="today") persist({transition:{dayId:day().id,completedId:id,nextId:state.current[day().id] || null}}); renderToday(); renderPlan(); if($("#placeDialog")?.open) openPlace(id,false); else if(state.view === "plan") setTimeout(() => $("#dayCompanion")?.scrollIntoView({behavior:"smooth",block:"start"}),100); }
    if (action === "save") { const id=target.dataset.id; update(s => ({...s,saved:s.saved.includes(id)?s.saved.filter(x=>x!==id):[...s.saved,id]})); renderPlan(); if (state.view === "saved") renderSaved(); }
    if(action === "save" && $("#placeDialog")?.open) openPlace($("#placeDialog").dataset.id,false);
    if (action === "food-filter") { persist({foodVegetarian:target.dataset.value === "veg" ? !state.foodVegetarian : false}); renderFood(); renderMapFilters(); if(state.view === "map")renderMap(); }
    if (action === "scenario") scenarioResult(target.dataset.scenario);
    if (action === "offline") { persist({offlinePreparedAt:new Date().toISOString()}); renderPractical(); toast("Plan i dane są gotowe offline"); }
    if (action === "phrase") renderPhrases(target.dataset.key);
    if (action === "check") { update(s => ({...s,checklist:{...s.checklist,[target.dataset.id]:target.checked}})); }
    if (action === "expense-remove") { update(s => ({...s,expenses:s.expenses.filter((_,i)=>i!==Number(target.dataset.index))})); renderBudget(); }
    if (action === "reset" && confirm("Usunąć profil wyjazdu, plan, postęp, zapisane miejsca i budżet na tym urządzeniu?")) { state=store.reset(); renderAll(); toast("Dane zostały usunięte"); }
    if (action === "utility" && target.dataset.utility === "transport") { setView("help"); const t=data.transport.city; $("#helpResult").classList.add("has-content"); $("#helpResult").innerHTML=`<h3>${t.title}</h3><p>${t.best}</p>${t.tickets.map(x=>`<p><b>${x.name} · ${x.price}</b><br>${x.note}</p>`).join("")}<p>${t.tap}</p><a href="${t.officialUrl}" target="_blank" rel="noopener">Aktualne informacje ATAC</a>`; }
  });
  document.addEventListener("submit", event => {
    if (event.target.id === "tripForm") { event.preventDefault(); saveTrip(event.target); }
    if (event.target.id === "budgetForm") { event.preventDefault(); const values=new FormData(event.target); update(s=>({...s,expenses:[...s.expenses,{label:values.get("label"),amount:Number(values.get("amount"))}]})); renderBudget(); }
    if (event.target.id === "hotelRouteForm") { event.preventDefault(); const values=new FormData(event.target); persist({hotelAddress:String(values.get("hotelAddress") || "").trim()}); renderArrivalJourney(); toast("Adres noclegu zapisany na tym urządzeniu"); }
  });
  document.addEventListener("change", event => {
    const target = event.target;
    if (target.id === "budgetLimit") { persist({budgetLimit:Number(target.value)}); renderBudget(); }
    if (target.dataset.routeDate) {
      persist({tripDates:{...(state.tripDates || {}),[target.dataset.routeDate]:target.value}});
      renderPlan(); renderTicketGuide();
    }
    if (target.dataset.routeSlot) {
      const patch={anchorSlots:{...(state.anchorSlots || {}),[target.dataset.routeSlot]:target.value}};
      if(target.dataset.routeSlot==="st-peter-dome")patch.routeOptions={...(state.routeOptions || {}),vaticanDome:Boolean(target.value)};
      persist(patch);
      renderPlan(); renderTicketGuide();
    }
    if (target.dataset.routeOption) {
      persist({routeOptions:{...(state.routeOptions || {}),[target.dataset.routeOption]:target.checked}});
      renderPlan(); renderTicketGuide();
    }
  });
  $("#plannerForm").addEventListener("submit", event => { event.preventDefault(); applyPlanner(event.target); $("#plannerDialog").close(); });
  addEventListener("online", updateNetwork); addEventListener("offline", updateNetwork);
  addEventListener("popstate", () => { const id=new URLSearchParams(location.search).get("place"); if(id) openPlace(id,false); else $("#placeDialog")?.close(); });
}
function updateNetwork() { const online=navigator.onLine; $("#networkStatus").textContent=online?"online":"offline"; $("#networkStatus").classList.toggle("is-offline",!online); document.body.classList.toggle("offline",!online); }

async function setupServiceWorker() {
  if (!("serviceWorker" in navigator) || !location.protocol.startsWith("http")) return;
  serviceWorkerRegistration=await navigator.serviceWorker.register("sw.js?v=25");
  const showUpdate=()=>{ if(navigator.serviceWorker.controller) $("#updateNotice").hidden=false; };
  if(serviceWorkerRegistration.waiting)showUpdate();
  serviceWorkerRegistration.addEventListener("updatefound",()=>{
    const worker=serviceWorkerRegistration.installing;
    worker?.addEventListener("statechange",()=>{ if(worker.state==="installed")showUpdate(); });
  });
  navigator.serviceWorker.addEventListener("controllerchange",()=>{ if(updateRequested) location.reload(); });
}

async function init() {
  try { migrateStoredState(); await loadData(); const autoDay=currentTripDayId(); if(autoDay && !state.startedDays?.[state.dayId]) persist({dayId:autoDay,mapDay:autoDay}); plannerChoices(); bindEvents(); renderAll(); setView(state.view || "today"); updateNetwork(); await setupServiceWorker(); }
  catch(error) { console.error(error); $("#todayPanel").innerHTML=`<article class="today-card"><h2>Nie udało się otworzyć przewodnika</h2><p>Odśwież stronę. Jeśli jesteś offline i otwierasz ją pierwszy raz, połącz się z internetem.</p></article>`; }
}
init().then(() => { const id=new URLSearchParams(location.search).get("place"); if(id && data.places) openPlace(id,false); });
