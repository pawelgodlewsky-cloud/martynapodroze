import { createStore } from "/guides/core/storage.js";
import { distanceKm, mapsUrl, routeUrl } from "/guides/core/geo.js";

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const escapeHtml = value => String(value ?? "").replace(/[&<>'"]/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"})[char]);
const money = value => `${Number(value || 0).toFixed(2).replace(".", ",")} €`;
const demoMode = new URLSearchParams(location.search).get("demo") === "1" || location.pathname.includes("/demo/");
const defaults = { view:"today", dayId:"day-1", mapDay:"day-1", mapCategory:"all", done:[], saved:[], current:{}, mode:"full", planner:null, checklist:{}, budgetLimit:0, expenses:[], foodVegetarian:false, offlinePreparedAt:null };
const store = createStore("rome", defaults);
let state = store.get();
let data = {};
let map = null;
let mapLayer = null;

async function loadData() {
  const names = ["guide","days","places","restaurants","tickets","transport","phrases","emergency"];
  const results = await Promise.all(names.map(name => fetch(`data/${name}.json`).then(response => {
    if (!response.ok) throw new Error(`Nie udało się wczytać ${name}`);
    return response.json();
  })));
  data = Object.fromEntries(names.map((name, index) => [name, results[index]]));
}

function persist(patch) { state = store.set(patch); }
function update(updater) { state = store.update(updater); }
function day() { return data.days.find(item => item.id === state.dayId) || data.days[0]; }
function place(id) { return data.places.find(item => item.id === id); }
function dayPlaces(selected = day()) { return selected.placeIds.map(place).filter(Boolean); }
function activeIds(selected = day()) {
  if (state.mode === "quick") return selected.quickIds;
  if (state.mode === "rain") return selected.rainIds;
  if (state.mode === "tired") return selected.lowEnergyIds;
  return selected.placeIds;
}
function activePlaces(selected = day()) { return activeIds(selected).map(place).filter(Boolean); }
function progress(selected = day()) {
  const ids = selected.placeIds;
  const done = ids.filter(id => state.done.includes(id)).length;
  return { done, total: ids.length, percent: ids.length ? Math.round(done / ids.length * 100) : 0 };
}
function currentPlace() {
  const selected = day();
  const active = activePlaces(selected);
  const explicit = place(state.current[selected.id]);
  return explicit || active.find(item => !state.done.includes(item.id)) || active.at(-1);
}
function nextPlace(current = currentPlace()) {
  const list = activePlaces();
  const index = list.findIndex(item => item.id === current?.id);
  return index >= 0 ? list[index + 1] : list[0];
}
function isDemoLocked(item, index) { return demoMode && (!data.guide.demo.unlockedDays.includes(day().id) || index >= data.guide.demo.unlockedPlaceCount); }
function toast(message) { const node = $("#toast"); node.textContent = message; node.classList.add("show"); setTimeout(() => node.classList.remove("show"), 1800); }

function setView(view) {
  persist({ view });
  $$(".view").forEach(node => node.classList.toggle("is-active", node.dataset.view === view));
  $$(".bottom-nav [data-view]").forEach(node => node.classList.toggle("is-active", node.dataset.view === view));
  if (view === "map") setTimeout(renderMap, 80);
  if (view === "saved") renderSaved();
  scrollTo({ top:0, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
}

function renderToday() {
  const selected = day();
  const stats = progress(selected);
  const current = currentPlace();
  const next = nextPlace(current);
  const remaining = activePlaces(selected).filter(item => !state.done.includes(item.id));
  const minutes = remaining.reduce((sum, item) => sum + item.duration + (item.next?.minutes || 0), 0);
  const booking = data.tickets.find(ticket => selected.reservations.includes(ticket.id));
  $("#todayPanel").innerHTML = `
    <article class="today-card next"><span class="card-label">Teraz / ${escapeHtml(selected.number)}</span><h2>${escapeHtml(current?.name || "Dzień ukończony")}</h2><p>${escapeHtml(current?.description || "Masz zrobioną całą aktywną trasę.")}</p><div class="today-meta"><span>${escapeHtml(current?.time || "")}</span><span>${current?.duration || 0} min</span><span>${escapeHtml(current?.price || "")}</span></div><div class="today-actions">${current ? `<a href="${mapsUrl(current.coordinates)}" target="_blank" rel="noopener">Prowadź mnie</a><button class="mini-button" data-action="done" data-id="${current.id}">${state.done.includes(current.id) ? "Cofnij ukończenie" : "Jestem po tym punkcie"}</button>` : ""}</div></article>
    <article class="today-card"><span class="card-label">Twój dzień</span><h2>${escapeHtml(selected.title)}</h2><p>${escapeHtml(selected.anchor)}</p><div class="today-meta"><span>${stats.done}/${stats.total} miejsc</span><span>około ${Math.ceil(minutes/60)} godz. zostało</span><span>tryb: ${modeLabel()}</span></div><div class="today-actions"><button class="mini-button" data-action="view" data-view="plan">Zobacz timeline</button>${next ? `<a href="${mapsUrl(next.coordinates)}" target="_blank" rel="noopener">Następny: ${escapeHtml(next.name)}</a>` : ""}</div></article>
    <article class="today-card"><span class="card-label">Najbliższa rezerwacja</span><h2>${escapeHtml(booking?.name || "Brak sztywnej rezerwacji")}</h2><p>${booking ? `${escapeHtml(booking.when)}. ${escapeHtml(booking.price)}.` : "Dziś możesz przesuwać trasę bez ryzyka utraty wejścia godzinowego."}</p>${booking ? `<div class="today-actions"><a href="${booking.ticketUrl}" target="_blank" rel="noopener">Oficjalne bilety</a></div>` : ""}</article>
    <article class="today-card"><span class="card-label">Szybkie działania</span><h2>Zmienił się plan?</h2><div class="today-actions"><button class="mini-button" data-action="scenario" data-scenario="delay">Mam opóźnienie</button><button class="mini-button" data-action="scenario" data-scenario="rain">Pada</button><button class="mini-button" data-action="scenario" data-scenario="hungry">Jestem głodna</button><a href="https://www.meteoam.it/it/meteo-citta/roma" target="_blank" rel="noopener">Prognoza dla Rzymu</a></div></article>${plannerSummary()}`;
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
  $("#reservations").innerHTML = `<p class="eyebrow">PRZED WYJAZDEM</p><h2>Co zarezerwować wcześniej</h2><div class="booking-list">${data.tickets.map(ticket => `<article class="booking-card"><span class="status-pill ${ticket.required ? "required" : ""}">${ticket.required ? "rezerwuj" : "opcjonalnie"}</span><b>${escapeHtml(ticket.name)}</b><p><strong>Kiedy:</strong> ${escapeHtml(ticket.when)}</p><p><strong>Koszt:</strong> ${escapeHtml(ticket.price)}</p><p><strong>Nie rób:</strong> ${escapeHtml(ticket.avoid)}</p><div class="place-actions"><a href="${ticket.ticketUrl}" target="_blank" rel="noopener">Oficjalny zakup</a></div><div class="source-line">Zweryfikowano ${ticket.lastVerified} · <a href="${ticket.sourceUrl}" target="_blank" rel="noopener">źródło</a></div></article>`).join("")}</div>`;
}

function renderPractical() {
  const transport = data.transport;
  $("#practical").innerHTML = `<p class="eyebrow">PRAKTYCZNIE</p><h2>Rzeczy, które oszczędzają czas</h2><div class="utility-grid">
    <article class="utility-card"><span class="card-label">Transport</span><h3>${transport.city.title}</h3><p>${transport.city.best}</p><button class="text-button" data-action="utility" data-utility="transport">Bilety i zasady</button></article>
    <article class="utility-card"><span class="card-label">Woda</span><h3>Nasoni</h3><p>Darmowa woda pitna jest dostępna w tysiącach miejskich fontann. Wybrane punkty są na mapie.</p><a class="text-button" href="https://www.turismoroma.it/en/node/167736" target="_blank" rel="noopener">Oficjalna mapa wody</a></article>
    <article class="utility-card"><span class="card-label">Offline</span><h3>${state.offlinePreparedAt ? "Gotowe na wyjście" : "Zapisz przed wyjściem"}</h3><p>Plan, adresy, checklisty i postęp zostają na urządzeniu. Kafle map i bieżące rozkłady wymagają internetu.</p><button class="text-button" data-action="offline">${state.offlinePreparedAt ? "Odśwież dane offline" : "Przygotuj offline"}</button></article>
    <article class="utility-card"><span class="card-label">Upał</span><h3>Przesuń, nie przyspieszaj</h3><p>Zewnętrzne odcinki rób rano i po 17:00. W środku dnia wybierz muzeum, bazylikę lub dłuższy obiad.</p><button class="text-button" data-action="scenario" data-scenario="heat">Plan na upał</button></article>
  </div>`;
}

function modeLabel() { return ({full:"pełny",quick:"mało czasu",rain:"deszcz",tired:"spokojny"})[state.mode] || "pełny"; }
function renderDaySwitcher() {
  $("#daySwitcher").innerHTML = data.days.map(item => `<button role="tab" aria-selected="${item.id === state.dayId}" class="${item.id === state.dayId ? "is-active" : ""}" data-action="day" data-id="${item.id}"><small>${item.number}</small>${escapeHtml(item.title)}</button>`).join("");
}
function renderDayOverview() {
  const selected = day();
  $("#dayOverview").innerHTML = `<article class="day-intro"><p class="eyebrow">DZIEŃ ${selected.number} / ${modeLabel()}</p><h3>${escapeHtml(selected.title)}</h3><p>${escapeHtml(selected.anchor)}</p><div class="day-facts"><span><b>${selected.duration}</b>czas</span><span><b>${selected.distance}</b>pieszo</span><span><b>${selected.intensity}</b>tempo</span><span><b>${selected.cost}</b>atrakcje</span><span><b>${selected.start}</b>start</span></div><div class="today-actions"><button class="mini-button" data-action="mode" data-mode="full">Pełna</button><button class="mini-button" data-action="mode" data-mode="quick">Mam mało czasu</button><button class="mini-button" data-action="mode" data-mode="tired">Jestem zmęczona</button><button class="mini-button" data-action="mode" data-mode="rain">Pada</button><a href="${routeUrl(activePlaces(selected).map(item => item.coordinates))}" target="_blank" rel="noopener">Otwórz całą trasę</a></div></article>`;
}

function renderTimeline() {
  const selected = day();
  const ids = activeIds(selected);
  const items = ids.map(place).filter(Boolean);
  $("#timeline").innerHTML = items.map((item, index) => {
    if (isDemoLocked(item, index)) return `<article class="place-card demo-lock" data-order="${index + 1}"><h3>Dalsza część trasy premium</h3><p>W wersji demo widzisz początek dnia i sposób prowadzenia. Pełny produkt zawiera wszystkie dni, warianty i mapy.</p><a class="button primary" href="${data.guide.demo.ctaUrl}">Zapytaj o przewodnik</a></article>`;
    const done = state.done.includes(item.id), saved = state.saved.includes(item.id);
    return `<article class="place-card" data-order="${index + 1}" id="place-${item.id}"><header class="place-head"><div><span class="card-label">${escapeHtml(item.category)} / ${escapeHtml(item.address)}</span><h3>${escapeHtml(item.name)}</h3></div><div class="place-time">${escapeHtml(item.time)}<small>${item.duration} min · ${escapeHtml(item.price)}</small></div></header><div class="photo-slot"><span>${escapeHtml(item.photo || "punkt praktyczny: bez zdjęcia")}</span></div><div class="place-body"><p>${escapeHtml(item.description)}</p><div class="place-details"><div class="detail"><b>Dlaczego warto</b>${escapeHtml(item.why)}</div><div class="detail"><b>Nie przegap</b>${escapeHtml(item.dontMiss || "To punkt praktyczny na trasie.")}</div></div><div class="tip"><b>Martyna podpowiada:</b> ${escapeHtml(item.tip)}</div>${item.warning ? `<div class="tip warning"><b>Uważaj:</b> ${escapeHtml(item.warning)}</div>` : ""}<div class="place-actions"><a href="${mapsUrl(item.coordinates)}" target="_blank" rel="noopener">Prowadź mnie</a>${item.officialUrl ? `<a href="${item.officialUrl}" target="_blank" rel="noopener">Oficjalna strona</a>` : ""}${item.ticketUrl ? `<a href="${item.ticketUrl}" target="_blank" rel="noopener">Bilety</a>` : ""}<button class="done ${done ? "is-active" : ""}" data-action="done" data-id="${item.id}">${done ? "Ukończone" : "Oznacz jako odwiedzone"}</button><button class="save ${saved ? "is-active" : ""}" data-action="save" data-id="${item.id}" aria-label="${saved ? "Usuń z zapisanych" : "Zapisz miejsce"}">${saved ? "Zapisane" : "Zapisz"}</button></div><div class="source-line">Zweryfikowano ${item.lastVerified} · <a href="${item.sourceUrl}" target="_blank" rel="noopener">źródło</a></div></div>${item.next?.to ? `<div class="next-leg"><span>Dalej: ${escapeHtml(place(item.next.to)?.name || item.next.to)}</span><span>${item.next.minutes} min · ${escapeHtml(item.next.distance)} · ${escapeHtml(item.next.mode)}</span></div>` : ""}</article>`;
  }).join("");
}

function restaurantsOnRoute() { const ids = new Set(day().placeIds); return data.restaurants.filter(item => ids.has(item.stage) && (!state.foodVegetarian || item.vegetarian)); }
function renderFood() {
  $("#foodSection").innerHTML = `<p class="eyebrow">JEDZENIE NA TRASIE</p><h2>Nie cofaj się na obiad</h2><div class="filter-row"><button class="${!state.foodVegetarian ? "is-active" : ""}" data-action="food-filter" data-value="all">Wszystkie</button><button class="${state.foodVegetarian ? "is-active" : ""}" data-action="food-filter" data-value="veg">Tylko wege</button></div><div class="food-grid">${restaurantsOnRoute().map(item => `<article class="food-card"><span class="status-pill">${escapeHtml(item.category)} · ${escapeHtml(item.price)}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.note)}</p><p><b>Zamów:</b> ${escapeHtml(item.order)}</p><a href="${item.maps}" target="_blank" rel="noopener">Otwórz w Google Maps</a></article>`).join("") || "<p>Brak lokali spełniających filtr na tym odcinku.</p>"}</div>`;
}
function renderExtras() {
  $("#extraSections").innerHTML = `<article class="utility-card"><span class="card-label">0 €</span><h3>Najlepsze rzeczy za darmo</h3>${data.guide.free.map(item => `<p>• ${escapeHtml(item)}</p>`).join("")}</article><article class="utility-card"><span class="card-label">Rzymskie smaki</span><h3>Tego spróbuj</h3>${data.guide.flavours.map(([name, desc]) => `<p><b>${escapeHtml(name)}</b><br>${escapeHtml(desc)}</p>`).join("")}</article><article class="utility-card"><span class="card-label">Bez straszenia</span><h3>Tego lepiej nie robić</h3>${data.guide.mistakes.map(item => `<p>• ${escapeHtml(item)}</p>`).join("")}</article>`;
}
function renderPlan() { renderDaySwitcher(); renderDayOverview(); renderTimeline(); renderFood(); renderExtras(); }

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
    L.marker(item.coordinates,{icon}).bindPopup(`<h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description || item.note)}</p><a href="${mapsUrl(item.coordinates)}" target="_blank" rel="noopener">Prowadź mnie</a>`).addTo(mapLayer); bounds.push(item.coordinates);
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

function renderSaved() {
  const total = data.days.reduce((sum,item) => sum + item.placeIds.length,0);
  const completed = new Set(state.done).size;
  const percent = Math.round(completed/total*100);
  $("#passport").innerHTML = `<article class="passport-card"><div class="passport-top"><div><p class="eyebrow">POSTĘP</p><h2>${completed} z ${total} miejsc</h2><p>${data.days.filter(item => progress(item).percent === 100).length} ukończonych dni · plan na dziś: ${escapeHtml(day().title)}</p></div><div class="progress-ring" style="--progress:${percent}%"><b>${percent}%</b></div></div></article>`;
  const saved = state.saved.map(place).filter(Boolean);
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
    const current = currentPlace(); body = `<p>Aktualny punkt to <b>${escapeHtml(current?.name)}</b>.</p><a class="button primary" href="${mapsUrl(current.coordinates)}" target="_blank" rel="noopener">Prowadź mnie tutaj</a>`;
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
function applyPlanner(form) {
  const values = new FormData(form); const duration = values.get("duration") || "3", pace = values.get("pace") || "normal", company = values.get("company") || "solo", interests = values.getAll("interests");
  let dayId = interests.includes("vatican") ? "day-2" : interests.includes("streets") || interests.includes("food") ? "day-3" : "day-1";
  if (duration === "4" && interests.includes("hidden")) dayId = "day-4b";
  const mode = duration === "hours" || pace === "slow" || company === "mobility" ? "tired" : "full";
  persist({ planner:{duration,pace,company,interests}, dayId, mode });
  renderAll(); toast("Plan dopasowany i zapisany"); setView("today");
}

function renderAll() { renderToday(); renderReservations(); renderPractical(); renderPlan(); renderMapFilters(); renderMapFallback(); renderSaved(); renderHelp(); }
function bindEvents() {
  document.addEventListener("click", event => {
    const target = event.target.closest("[data-action]"); if (!target) return;
    const action = target.dataset.action;
    if (action === "view") setView(target.dataset.view);
    if (action === "continue") { setView("plan"); setTimeout(() => $(`#place-${currentPlace()?.id}`)?.scrollIntoView({behavior:"smooth",block:"start"}),100); }
    if (action === "open-planner") $("#plannerDialog").showModal();
    if (action === "day") { persist({dayId:target.dataset.id,mode:"full"}); renderAll(); }
    if (action === "map-day") { persist({mapDay:target.dataset.id}); renderMapFilters(); renderMap(); }
    if (action === "map-category") { persist({mapCategory:target.dataset.id}); renderMapFilters(); renderMap(); }
    if (action === "mode") { persist({mode:target.dataset.mode}); renderToday(); renderPlan(); }
    if (action === "done") { const id=target.dataset.id; update(s => ({...s,done:s.done.includes(id)?s.done.filter(x=>x!==id):[...s.done,id],current:{...s.current,[day().id]:nextPlace(place(id))?.id || id}})); renderToday(); renderPlan(); }
    if (action === "save") { const id=target.dataset.id; update(s => ({...s,saved:s.saved.includes(id)?s.saved.filter(x=>x!==id):[...s.saved,id]})); renderPlan(); if (state.view === "saved") renderSaved(); }
    if (action === "food-filter") { persist({foodVegetarian:target.dataset.value === "veg" ? !state.foodVegetarian : false}); renderFood(); renderMapFilters(); if(state.view === "map")renderMap(); }
    if (action === "scenario") scenarioResult(target.dataset.scenario);
    if (action === "offline") { persist({offlinePreparedAt:new Date().toISOString()}); renderPractical(); toast("Plan i dane są gotowe offline"); }
    if (action === "phrase") renderPhrases(target.dataset.key);
    if (action === "check") { update(s => ({...s,checklist:{...s.checklist,[target.dataset.id]:target.checked}})); }
    if (action === "expense-remove") { update(s => ({...s,expenses:s.expenses.filter((_,i)=>i!==Number(target.dataset.index))})); renderBudget(); }
    if (action === "reset" && confirm("Usunąć postęp, zapisane miejsca, checklistę i budżet na tym urządzeniu?")) { state=store.reset(); renderAll(); toast("Dane zostały usunięte"); }
    if (action === "utility" && target.dataset.utility === "transport") { setView("help"); const t=data.transport.city; $("#helpResult").classList.add("has-content"); $("#helpResult").innerHTML=`<h3>${t.title}</h3><p>${t.best}</p>${t.tickets.map(x=>`<p><b>${x.name} · ${x.price}</b><br>${x.note}</p>`).join("")}<p>${t.tap}</p><a href="${t.officialUrl}" target="_blank" rel="noopener">Aktualne informacje ATAC</a>`; }
  });
  document.addEventListener("submit", event => {
    if (event.target.id === "budgetForm") { event.preventDefault(); const values=new FormData(event.target); update(s=>({...s,expenses:[...s.expenses,{label:values.get("label"),amount:Number(values.get("amount"))}]})); renderBudget(); }
  });
  document.addEventListener("change", event => { if(event.target.id === "budgetLimit"){persist({budgetLimit:Number(event.target.value)});renderBudget();} });
  $("#plannerForm").addEventListener("submit", event => { event.preventDefault(); applyPlanner(event.target); $("#plannerDialog").close(); });
  addEventListener("online", updateNetwork); addEventListener("offline", updateNetwork);
}
function updateNetwork() { const online=navigator.onLine; $("#networkStatus").textContent=online?"online":"offline"; $("#networkStatus").classList.toggle("is-offline",!online); document.body.classList.toggle("offline",!online); }

async function init() {
  try { await loadData(); plannerChoices(); bindEvents(); renderAll(); setView(state.view || "today"); updateNetwork(); if("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js?v=4"); }
  catch(error) { console.error(error); $("#todayPanel").innerHTML=`<article class="today-card"><h2>Nie udało się otworzyć przewodnika</h2><p>Odśwież stronę. Jeśli jesteś offline i otwierasz ją pierwszy raz, połącz się z internetem.</p></article>`; }
}
init();
