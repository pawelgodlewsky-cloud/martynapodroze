const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

const listView = $("#list-view");
const formView = $("#form-view");
const form = $("#trip-form");
const list = $("#trip-list");
const extraLinks = $("#extra-links");
const listNotice = $("#list-notice");
const formNotice = $("#form-notice");
let trips = [];
let slugTouched = false;

const statusLabels = { active: "Aktywna", draft: "Szkic", disabled: "Wyłączona", expired: "Wygasła" };
function showNotice(element, message, success = false) {
  element.textContent = message;
  element.hidden = false;
  element.classList.toggle("is-success", success);
  if (success) setTimeout(() => { element.hidden = true; }, 4500);
}

function hideNotices() {
  listNotice.hidden = true;
  formNotice.hidden = true;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: options.body ? { "Content-Type": "application/json", ...(options.headers || {}) } : options.headers
  });
  const payload = await response.json().catch(() => ({}));
  if (response.status === 401) {
    location.assign("/admin/wyjazdy/login/");
    throw new Error("Sesja wygasła. Zaloguj się ponownie.");
  }
  if (!response.ok) throw new Error(payload.error || `Błąd HTTP ${response.status}`);
  return payload;
}

function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

function automaticSlug() {
  const destination = $("#destination").value;
  const start = $("#start_date").value;
  const end = $("#end_date").value;
  if (!destination) return "";
  if (!start || !end) return slugify(destination);
  const months = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "wrzesnia", "pazdziernika", "listopada", "grudnia"];
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const sameMonth = startDate.getUTCMonth() === endDate.getUTCMonth();
  const datePart = sameMonth
    ? `${startDate.getUTCDate()}-${endDate.getUTCDate()}-${months[endDate.getUTCMonth()]}`
    : `${startDate.getUTCDate()}-${months[startDate.getUTCMonth()]}-${endDate.getUTCDate()}-${months[endDate.getUTCMonth()]}`;
  return slugify(`${destination}-${datePart}`);
}

function updateAutomaticSlug() {
  if (!slugTouched) $("#slug").value = automaticSlug();
}

function formatPrice(value, currency = "PLN") {
  return new Intl.NumberFormat("pl-PL", { style: "currency", currency, maximumFractionDigits: 2 }).format(Number(value));
}

function formatDateRange(start, end, year = true) {
  const startDate = new Date(`${start}T00:00:00Z`);
  const endDate = new Date(`${end}T00:00:00Z`);
  const months = ["stycznia", "lutego", "marca", "kwietnia", "maja", "czerwca", "lipca", "sierpnia", "września", "października", "listopada", "grudnia"];
  const suffix = year ? ` ${endDate.getUTCFullYear()}` : "";
  if (startDate.getUTCMonth() === endDate.getUTCMonth()) {
    return `${startDate.getUTCDate()}–${endDate.getUTCDate()} ${months[endDate.getUTCMonth()]}${suffix}`;
  }
  return `${startDate.getUTCDate()} ${months[startDate.getUTCMonth()]} – ${endDate.getUTCDate()} ${months[endDate.getUTCMonth()]}${suffix}`;
}

function effectiveStatus(trip) {
  return trip.status === "active" && trip.expires_at && new Date(trip.expires_at) <= new Date() ? "expired" : trip.status;
}

function stat(label, value) {
  const element = document.createElement("div");
  element.className = "stat";
  const strong = document.createElement("strong");
  strong.textContent = String(value);
  const span = document.createElement("span");
  span.textContent = label;
  element.append(strong, span);
  return element;
}

function actionButton(label, action, id, danger = false) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.dataset.action = action;
  button.dataset.id = id;
  if (danger) button.className = "danger";
  return button;
}

function renderTrips() {
  list.replaceChildren();
  if (!trips.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Nie ma jeszcze żadnej propozycji. Utwórz pierwszą — zajmie to mniej niż minutę.";
    list.append(empty);
    return;
  }

  trips.forEach((trip) => {
    const status = effectiveStatus(trip);
    const row = document.createElement("article");
    row.className = "trip-row";
    const main = document.createElement("div");
    main.className = "trip-main";
    const top = document.createElement("div");
    top.className = "trip-main__top";
    const heading = document.createElement("h2");
    heading.textContent = `${trip.country_emoji || ""} ${trip.destination}`.trim();
    const badge = document.createElement("span");
    badge.className = `status status--${status}`;
    badge.textContent = statusLabels[status] || status;
    top.append(heading, badge);
    const details = document.createElement("p");
    details.textContent = `${trip.departure_city} · ${formatDateRange(trip.start_date, trip.end_date)} · ${formatPrice(trip.total_price, trip.currency)}/os.`;
    main.append(top, details);

    const stats = document.createElement("div");
    stats.className = "stats";
    stats.append(stat("wejścia", trip.views), stat("lot", trip.flight_clicks), stat("nocleg", trip.lodging_clicks), stat("CTR", `${trip.ctr}%`));

    const actions = document.createElement("div");
    actions.className = "row-actions";
    actions.append(
      actionButton("Edytuj", "edit", trip.id),
      actionButton("Podgląd", "preview", trip.id),
      actionButton("Kopiuj link", "copy-link", trip.id),
      actionButton("Kopiuj wiadomość", "copy-message", trip.id),
      actionButton("Utwórz podobną", "duplicate", trip.id),
      actionButton(status === "disabled" ? "Włącz" : "Dezaktywuj", "toggle", trip.id),
      actionButton("Usuń", "delete", trip.id, true)
    );
    const preview = $("[data-action=preview]", actions);
    if (status !== "active") preview.setAttribute("aria-disabled", "true");
    row.append(main, stats, actions);
    list.append(row);
  });
}

async function loadTrips() {
  list.replaceChildren(Object.assign(document.createElement("p"), { className: "loading", textContent: "Ładowanie propozycji…" }));
  try {
    const result = await api("/api/admin/trips");
    trips = result.trips;
    renderTrips();
  } catch (error) {
    list.replaceChildren();
    showNotice(listNotice, error.message);
  }
}

function inputValue(root, field) {
  return $(`[data-field="${field}"]`, root)?.value.trim() || "";
}

function readLink(root, index) {
  const type = root.dataset.type === "extra" ? inputValue(root, "type") : root.dataset.type;
  const from = inputValue(root, "from_location");
  const to = inputValue(root, "to_location");
  let label = inputValue(root, "label");
  if (type === "flight") label = from && to ? `${from} → ${to}` : inputValue(root, "provider") || "Lot";
  return {
    id: inputValue(root, "id") || undefined,
    type,
    label,
    description: inputValue(root, "description") || null,
    price: inputValue(root, "price") || null,
    currency: $("#currency").value,
    url: inputValue(root, "url"),
    sort_order: index,
    from_location: from || null,
    to_location: to || null,
    provider: inputValue(root, "provider") || null,
    nights: inputValue(root, "nights") || null
  };
}

function serializeForm(status) {
  const roots = $$(".link-fields", form);
  return {
    slug: $("#slug").value,
    destination: $("#destination").value,
    country: $("#country").value,
    country_emoji: $("#country_emoji").value,
    departure_city: $("#departure_city").value,
    departure_airport: $("#departure_airport").value,
    start_date: $("#start_date").value,
    end_date: $("#end_date").value,
    total_price: $("#total_price").value,
    currency: $("#currency").value,
    expires_at: $("#expires_at").value || null,
    personal_note: $("#personal_note").value,
    status,
    links: roots.map(readLink)
  };
}

function setField(root, field, value) {
  const element = $(`[data-field="${field}"]`, root);
  if (element) element.value = value ?? "";
}

function addExtraLink(link = {}) {
  const row = document.createElement("div");
  row.className = "extra-row link-fields";
  row.dataset.type = "extra";
  row.innerHTML = `<div class="extra-row__head"><strong>Dodatkowy element</strong><button class="remove-extra" type="button">Usuń element</button></div>
    <input type="hidden" data-field="id">
    <div class="fields fields--three">
      <label><span>Typ</span><select data-field="type"><option value="transfer">Transfer</option><option value="parking">Parking</option><option value="attraction">Atrakcja</option><option value="car">Samochód</option><option value="train">Pociąg</option><option value="bus">Autobus</option><option value="other">Inne</option></select></label>
      <label class="field--wide"><span>Nazwa *</span><input data-field="label" required placeholder="Transfer z lotniska"></label>
      <label><span>Cena</span><input data-field="price" type="number" min="0" step="0.01" placeholder="50"></label>
      <label class="field--wide"><span>URL *</span><input data-field="url" type="url" required placeholder="https://..."></label>
      <label class="field--wide"><span>Opis</span><textarea data-field="description" rows="2" placeholder="Krótka wskazówka"></textarea></label>
    </div>`;
  ["id", "type", "label", "price", "url", "description"].forEach((field) => setField(row, field, link[field]));
  $(".remove-extra", row).addEventListener("click", () => row.remove());
  extraLinks.append(row);
}

function showForm(trip = null) {
  hideNotices();
  form.reset();
  extraLinks.replaceChildren();
  $("#trip-id").value = trip?.id || "";
  $("#status").value = trip?.status || "draft";
  $("#form-title").textContent = trip ? `Edytuj: ${trip.destination}` : "Nowa propozycja";
  slugTouched = Boolean(trip);

  if (trip) {
    ["destination", "country", "country_emoji", "departure_city", "departure_airport", "start_date", "end_date", "total_price", "currency", "slug", "personal_note"].forEach((field) => {
      $(`#${field}`).value = trip[field] ?? "";
    });
    $("#expires_at").value = trip.expires_at ? trip.expires_at.slice(0, 16) : "";
    const flight = trip.links.find((link) => link.type === "flight");
    const lodging = trip.links.find((link) => link.type === "lodging");
    const fixed = [[$("[data-type=flight]", form), flight], [$("[data-type=lodging]", form), lodging]];
    fixed.forEach(([root, link]) => {
      if (!link) return;
      ["id", "label", "description", "price", "url", "from_location", "to_location", "provider", "nights"].forEach((field) => setField(root, field, link[field]));
    });
    trip.links.filter((link) => !["flight", "lodging"].includes(link.type)).forEach(addExtraLink);
  }
  listView.hidden = true;
  formView.hidden = false;
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function editTrip(id) {
  try {
    const result = await api(`/api/admin/trips/${id}`);
    showForm(result.trip);
  } catch (error) {
    showNotice(listNotice, error.message);
  }
}

async function copyText(text, successMessage) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
  showNotice(listNotice, successMessage, true);
}

function publicUrl(trip) {
  return `${location.origin}/w/${trip.slug}`;
}

function tripMessage(trip) {
  return `Cześć 😊\n\nPrzygotowałam propozycję wyjazdu do ${trip.destination} ${trip.country_emoji || ""}\n\n✈️ ${trip.departure_city} → ${trip.destination}\n📅 ${formatDateRange(trip.start_date, trip.end_date, false)}\n💰 ${formatPrice(trip.total_price, trip.currency)}/os. za lot + nocleg\n\nWszystkie szczegóły:\n${publicUrl(trip)}`;
}

async function toggleTrip(trip) {
  const nextStatus = effectiveStatus(trip) === "disabled" ? "active" : "disabled";
  try {
    const detail = await api(`/api/admin/trips/${trip.id}`);
    const payload = { ...detail.trip, status: nextStatus };
    delete payload.id;
    delete payload.created_at;
    delete payload.updated_at;
    await api(`/api/admin/trips/${trip.id}`, { method: "PUT", body: JSON.stringify(payload) });
    await loadTrips();
    showNotice(listNotice, nextStatus === "active" ? "Propozycja jest ponownie aktywna." : "Propozycja została dezaktywowana.", true);
  } catch (error) {
    showNotice(listNotice, error.message);
  }
}

list.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || target.getAttribute("aria-disabled") === "true") return;
  const trip = trips.find((item) => item.id === target.dataset.id);
  if (!trip) return;
  const action = target.dataset.action;
  if (action === "edit") return editTrip(trip.id);
  if (action === "preview") return window.open(publicUrl(trip), "_blank", "noopener");
  if (action === "copy-link") return copyText(publicUrl(trip), "Link skopiowany.");
  if (action === "copy-message") return copyText(tripMessage(trip), "Wiadomość skopiowana.");
  if (action === "toggle") return toggleTrip(trip);
  if (action === "duplicate") {
    try {
      const result = await api(`/api/admin/trips/${trip.id}/duplicate`, { method: "POST" });
      showForm(result.trip);
      showNotice(formNotice, "Utworzono nowy szkic bez statystyk. Zmień dane i zapisz.", true);
    } catch (error) { showNotice(listNotice, error.message); }
  }
  if (action === "delete" && confirm(`Usunąć propozycję „${trip.destination}”? Tej operacji nie można cofnąć.`)) {
    try {
      await api(`/api/admin/trips/${trip.id}`, { method: "DELETE" });
      await loadTrips();
      showNotice(listNotice, "Propozycja i jej statystyki zostały usunięte.", true);
    } catch (error) { showNotice(listNotice, error.message); }
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideNotices();
  if (!form.reportValidity()) return;
  const status = event.submitter?.dataset.saveStatus || $("#status").value || "draft";
  const id = $("#trip-id").value;
  const buttons = $$("button", form);
  buttons.forEach((button) => { button.disabled = true; });
  try {
    const result = await api(id ? `/api/admin/trips/${id}` : "/api/admin/trips", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(serializeForm(status))
    });
    $("#trip-id").value = result.trip.id;
    $("#status").value = result.trip.status;
    await loadTrips();
    listView.hidden = false;
    formView.hidden = true;
    showNotice(listNotice, status === "active" ? "Propozycja została opublikowana." : "Szkic został zapisany.", true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    showNotice(formNotice, error.message);
    formNotice.scrollIntoView({ behavior: "smooth", block: "center" });
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
});

$("#new-trip").addEventListener("click", () => showForm());
$("#back-to-list").addEventListener("click", () => { formView.hidden = true; listView.hidden = false; window.scrollTo({ top: 0, behavior: "smooth" }); });
$("#add-extra").addEventListener("click", () => addExtraLink());
$("#slug").addEventListener("input", () => { slugTouched = Boolean($("#slug").value); });
["#destination", "#start_date", "#end_date"].forEach((selector) => $(selector).addEventListener("input", updateAutomaticSlug));
$("#logout").addEventListener("click", async () => {
  try {
    await fetch("/api/admin/session", { method: "DELETE" });
  } finally {
    location.assign("/admin/wyjazdy/login/");
  }
});

loadTrips();
