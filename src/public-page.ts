import type { TripLinkRow, TripWithLinks } from "./types";
import { escapeHtml, formatPrice, formatTripDates } from "./trips";

const LINK_LABELS: Record<string, { section: string; action: string; icon: string }> = {
  flight: { section: "Lot", action: "Sprawdź lot", icon: "✈" },
  lodging: { section: "Nocleg", action: "Sprawdź nocleg", icon: "⌂" },
  transfer: { section: "Transfer", action: "Sprawdź transfer", icon: "↗" },
  parking: { section: "Parking", action: "Sprawdź parking", icon: "P" },
  attraction: { section: "Atrakcja", action: "Sprawdź atrakcję", icon: "☆" },
  car: { section: "Samochód", action: "Sprawdź samochód", icon: "◇" },
  train: { section: "Pociąg", action: "Sprawdź pociąg", icon: "↔" },
  bus: { section: "Autobus", action: "Sprawdź autobus", icon: "↦" },
  other: { section: "Dodatkowo", action: "Sprawdź szczegóły", icon: "+" }
};

function linkDetails(link: TripLinkRow): string {
  const details: string[] = [];
  if (link.type === "flight" && (link.from_location || link.to_location)) {
    details.push(`${escapeHtml(link.from_location ?? "")} <span aria-hidden="true">→</span> ${escapeHtml(link.to_location ?? "")}`);
  }
  if (link.provider) details.push(escapeHtml(link.provider));
  if (link.type === "lodging" && link.nights !== null) {
    details.push(`${link.nights} ${link.nights === 1 ? "noc" : link.nights < 5 ? "noce" : "nocy"}`);
  }
  return details.map((item) => `<span>${item}</span>`).join("");
}

function renderLink(link: TripLinkRow): string {
  const labels = LINK_LABELS[link.type] ?? LINK_LABELS.other!;
  return `<article class="offer-card">
    <div class="section-kicker"><span>${escapeHtml(labels.icon)}</span>${escapeHtml(labels.section)}</div>
    <div class="offer-card__head">
      <div>
        <h2>${escapeHtml(link.label)}</h2>
        <div class="offer-meta">${linkDetails(link)}</div>
      </div>
      ${link.price === null ? "" : `<strong class="item-price">${escapeHtml(formatPrice(link.price, link.currency))}</strong>`}
    </div>
    ${link.description ? `<p class="description">${escapeHtml(link.description)}</p>` : ""}
    <a class="offer-action" href="/go/${encodeURIComponent(link.id)}" rel="nofollow external">${escapeHtml(labels.action)} <span aria-hidden="true">→</span></a>
  </article>`;
}

export function renderPublicTrip(trip: TripWithLinks, requestUrl: string): string {
  const canonical = new URL(`/w/${encodeURIComponent(trip.slug)}`, requestUrl).toString();
  const destination = escapeHtml(trip.destination);
  const country = escapeHtml(trip.country);
  const flag = escapeHtml(trip.country_emoji);
  const dates = escapeHtml(formatTripDates(trip.start_date, trip.end_date));
  const price = escapeHtml(formatPrice(trip.total_price, trip.currency));
  const description = `Propozycja wyjazdu do ${trip.destination}: ${formatTripDates(trip.start_date, trip.end_date)}, ${formatPrice(trip.total_price, trip.currency)} za osobę.`;
  const ogImage = "https://martynapodroze.pl/assets/martyna-santorini-hero-v2.jpg";

  return `<!doctype html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${destination} — propozycja wyjazdu | Martyna Podróże</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta name="robots" content="noindex, nofollow, noarchive">
  <meta name="theme-color" content="#fffdfb">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pl_PL">
  <meta property="og:site_name" content="Martyna Podróże">
  <meta property="og:title" content="${flag} ${destination} — ${dates}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:url" content="${escapeHtml(canonical)}">
  <meta property="og:image" content="${escapeHtml(ogImage)}">
  <meta property="og:image:alt" content="Martyna Podróże">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${flag} ${destination} — propozycja wyjazdu">
  <meta name="twitter:description" content="${escapeHtml(description)}">
  <meta name="twitter:image" content="${escapeHtml(ogImage)}">
  <link rel="icon" href="https://martynapodroze.pl/assets/favicon.svg" type="image/svg+xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Cormorant+Garamond:wght@500;600&family=Manrope:wght@400;500;600;700&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="/assets/cookie-consent.css?v=1">
  <style>${PUBLIC_CSS}${COOKIE_FOOTER_CSS}</style>
</head>
<body data-cookie-analytics="worker">
  <header class="site-header">
    <a class="brand-name" href="/" aria-label="Martyna Podróże — strona główna"><strong>Martyna</strong> Podróże</a>
  </header>
  <main>
    <section class="trip-hero">
      <p class="handwritten">Propozycja przygotowana specjalnie dla Ciebie</p>
      <p class="destination-label">${flag} ${country}</p>
      <h1>${destination}</h1>
      <p class="route">${escapeHtml(trip.departure_city)} <span aria-hidden="true">→</span> ${destination}</p>
      <p class="dates">${dates}</p>
      <div class="total-price"><strong>${price}</strong><span>/ osoba</span><small>lot + nocleg</small></div>
    </section>
    <section class="offer-list" aria-label="Szczegóły propozycji">
      ${trip.links.map(renderLink).join("\n")}
    </section>
    ${trip.personal_note ? `<section class="personal-note"><p>Kilka słów ode mnie</p><div>${escapeHtml(trip.personal_note)}</div></section>` : ""}
    <section class="trip-newsletter" aria-labelledby="trip-newsletter-title">
      <div class="trip-newsletter__stamp" aria-hidden="true"><span>MP</span><small>poczta</small></div>
      <div class="trip-newsletter__copy">
        <p class="trip-newsletter__eyebrow">Pocztówka od Martyny</p>
        <h2 id="trip-newsletter-title">Chcesz więcej takich pomysłów na podróż?</h2>
        <p>Raz na jakiś czas wyślę Ci nowy kierunek, praktyczne wskazówki i wybrane okazje na loty oraz noclegi.</p>
      </div>
      <form class="trip-newsletter__form" id="trip-newsletter-form">
        <div class="trip-newsletter__fields">
          <label class="sr-only" for="trip-newsletter-email">Twój adres e-mail</label>
          <input id="trip-newsletter-email" name="email" type="email" autocomplete="email" placeholder="Twój adres e-mail" required>
          <button type="submit">Chcę podróżnicze inspiracje <span aria-hidden="true">→</span></button>
        </div>
        <label class="trip-newsletter__consent"><input id="trip-newsletter-consent" name="consent" type="checkbox" required><span>Chcę otrzymywać propozycje tanich lotów i praktyczne wskazówki. Mogę wypisać się w każdej chwili. <a href="/polityka-prywatnosci.html">Polityka prywatności</a>.</span></label>
        <label class="trip-newsletter__honeypot" aria-hidden="true">Strona internetowa<input id="trip-newsletter-website" name="website" type="text" tabindex="-1" autocomplete="off"></label>
        <p class="trip-newsletter__status" id="trip-newsletter-status" role="status" aria-live="polite"></p>
      </form>
    </section>
    <section class="prepared-by">
      <p>Propozycję przygotowała</p>
      <div class="brand-name brand-name--large"><strong>Martyna</strong> Podróże</div>
      <a href="https://www.instagram.com/martyna_podroze/" rel="me noopener external">Obserwuj @martyna_podroze <span aria-hidden="true">→</span></a>
    </section>
  </main>
  <footer><p>Ceny i dostępność mogą się zmienić. Rezerwacji dokonujesz bezpośrednio u wskazanego dostawcy na jego warunkach.</p><nav><a href="/polityka-prywatnosci.html">Prywatność i cookies</a><button type="button" data-cookie-settings>Ustawienia cookies</button></nav></footer>
  <script src="/assets/cookie-consent.js?v=1"></script>
  <script src="/assets/trip-newsletter.js?v=1"></script>
</body>
</html>`;
}

const COOKIE_FOOTER_CSS = `footer p{margin:0}footer nav{display:flex;flex-wrap:wrap;justify-content:center;gap:14px;margin-top:8px}footer nav a,footer nav button{border:0;background:none;padding:0;color:#706760;cursor:pointer;font:700 .62rem "Manrope",sans-serif;text-decoration:underline;text-underline-offset:3px}`;

const PUBLIC_CSS = `
:root{--paper:#fffdfb;--cream:#fbf8f4;--ink:#2d2926;--muted:#6f6862;--coral:#c86e59;--yellow:#e9b84f;--line:#e8ddd2}
.brand-name{font-family:"Cormorant Garamond",serif;font-size:1.65rem;letter-spacing:-.03em;text-decoration:none}.brand-name strong{color:var(--coral);font-weight:600}.brand-name--large{margin:0 auto 24px;font-size:2.35rem}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 12% 8%,rgba(233,184,79,.09),transparent 25%),var(--cream);color:var(--ink);font-family:"Manrope",sans-serif}a{color:inherit}.sr-only{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap}.site-header{display:flex;min-height:76px;align-items:center;justify-content:center;border-bottom:1px solid var(--line);background:rgba(255,253,251,.94)}.site-header img{display:block;width:210px;height:auto}main{width:min(100% - 28px,720px);margin:auto}.trip-hero{padding:52px 12px 44px;text-align:center}.handwritten{margin:0 0 28px;color:var(--coral);font-family:"Caveat",cursive;font-size:1.35rem}.destination-label{margin:0;color:var(--muted);font-size:.72rem;font-weight:700;letter-spacing:.16em;text-transform:uppercase}.trip-hero h1{margin:7px 0 14px;font-family:"Cormorant Garamond",serif;font-size:clamp(3.9rem,18vw,6.8rem);font-weight:600;letter-spacing:-.055em;line-height:.85}.route,.dates{margin:5px 0;color:var(--muted)}.route{font-size:1rem;font-weight:600}.dates{font-family:"Cormorant Garamond",serif;font-size:1.35rem}.total-price{display:flex;width:fit-content;flex-wrap:wrap;align-items:baseline;justify-content:center;gap:4px;margin:28px auto 0;border-top:1px solid var(--line);padding-top:22px}.total-price strong{color:var(--coral);font-family:"Cormorant Garamond",serif;font-size:2.9rem;line-height:.9}.total-price span{font-size:.8rem}.total-price small{width:100%;color:var(--muted);font-size:.67rem;letter-spacing:.12em;text-transform:uppercase}.offer-list{display:grid;gap:15px}.offer-card{border:1px solid var(--line);border-radius:20px;background:var(--paper);box-shadow:0 14px 38px rgba(73,57,45,.07);padding:24px 20px}.section-kicker{display:flex;align-items:center;gap:8px;margin-bottom:15px;color:var(--coral);font-size:.65rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.section-kicker span{display:grid;width:29px;height:29px;place-items:center;border-radius:50%;background:#f5e7df;font-size:.86rem}.offer-card__head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.offer-card h2{margin:0;font-family:"Cormorant Garamond",serif;font-size:2rem;font-weight:600;line-height:1}.item-price{flex:none;color:var(--coral);font-family:"Cormorant Garamond",serif;font-size:1.5rem}.offer-meta{display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:9px;color:var(--muted);font-size:.76rem}.description{margin:18px 0 0;border-top:1px solid var(--line);padding-top:16px;color:var(--muted);font-size:.84rem;line-height:1.7;white-space:pre-line}.offer-action{display:flex;min-height:50px;align-items:center;justify-content:space-between;margin-top:21px;border-radius:10px;background:var(--yellow);padding:12px 17px;font-size:.72rem;font-weight:800;letter-spacing:.07em;text-decoration:none;text-transform:uppercase}.offer-action:hover{filter:brightness(.98)}.personal-note{margin:32px 3px;padding:30px 24px;border-left:3px solid var(--coral);background:#f7eee7}.personal-note p{margin:0 0 9px;color:var(--coral);font-family:"Caveat",cursive;font-size:1.55rem}.personal-note div{color:var(--muted);font-family:"Cormorant Garamond",serif;font-size:1.35rem;line-height:1.45;white-space:pre-line}.trip-newsletter{position:relative;margin:34px 0 2px;overflow:hidden;border:1px solid #dfc6b8;border-radius:24px;background:linear-gradient(135deg,#fffaf5 0%,#f8e9df 100%);box-shadow:0 18px 45px rgba(91,61,44,.09);padding:30px 22px}.trip-newsletter::before{position:absolute;inset:11px;border:1px dashed rgba(200,110,89,.3);border-radius:16px;content:"";pointer-events:none}.trip-newsletter__stamp{position:absolute;top:24px;right:21px;display:grid;width:62px;height:62px;place-content:center;transform:rotate(8deg);border:2px solid rgba(200,110,89,.55);border-radius:50%;color:var(--coral);font-family:"Manrope",sans-serif;text-align:center}.trip-newsletter__stamp::after{position:absolute;inset:4px;border:1px solid rgba(200,110,89,.4);border-radius:50%;content:""}.trip-newsletter__stamp span{font-family:"Cormorant Garamond",serif;font-size:1.4rem;font-weight:600;line-height:.8}.trip-newsletter__stamp small{font-size:.43rem;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.trip-newsletter__copy,.trip-newsletter__form{position:relative;z-index:1}.trip-newsletter__copy{padding-right:65px}.trip-newsletter__eyebrow{margin:0 0 5px;color:var(--coral);font-family:"Caveat",cursive;font-size:1.35rem}.trip-newsletter h2{max-width:500px;margin:0;font-family:"Cormorant Garamond",serif;font-size:clamp(2rem,8vw,2.65rem);font-weight:600;letter-spacing:-.025em;line-height:1}.trip-newsletter__copy>p:last-child{max-width:550px;margin:14px 0 22px;color:var(--muted);font-size:.84rem;line-height:1.65}.trip-newsletter__fields{display:grid;gap:9px}.trip-newsletter__fields input{width:100%;min-height:51px;border:1px solid #d9c5b9;border-radius:11px;background:rgba(255,253,251,.92);padding:12px 15px;color:var(--ink);font:500 .84rem "Manrope",sans-serif;outline:none}.trip-newsletter__fields input:focus{border-color:var(--coral);box-shadow:0 0 0 3px rgba(200,110,89,.14)}.trip-newsletter__fields button{display:flex;min-height:51px;align-items:center;justify-content:space-between;border:0;border-radius:11px;background:var(--coral);padding:12px 17px;color:#fff;font:800 .68rem "Manrope",sans-serif;letter-spacing:.055em;text-align:left;text-transform:uppercase;cursor:pointer;transition:transform .18s ease,background .18s ease}.trip-newsletter__fields button:hover{background:#b85f4d;transform:translateY(-1px)}.trip-newsletter__fields button:focus-visible{outline:3px solid rgba(200,110,89,.28);outline-offset:3px}.trip-newsletter__fields button:disabled{cursor:wait;opacity:.7;transform:none}.trip-newsletter__consent{display:flex;align-items:flex-start;gap:9px;margin-top:13px;color:#746a63;font-size:.61rem;line-height:1.55}.trip-newsletter__consent input{flex:none;width:16px;height:16px;margin:1px 0 0;accent-color:var(--coral)}.trip-newsletter__consent a{text-underline-offset:2px}.trip-newsletter__honeypot{position:absolute!important;left:-10000px!important;width:1px!important;height:1px!important;overflow:hidden!important}.trip-newsletter__status{min-height:1.2em;margin:11px 0 0;color:#356a4c;font-size:.72rem;font-weight:700}.trip-newsletter__status.is-error{color:#9d3e35}.prepared-by{padding:43px 0 50px;text-align:center}.prepared-by p{margin:0 0 12px;color:var(--muted);font-size:.7rem;letter-spacing:.08em;text-transform:uppercase}.prepared-by img{width:245px;height:auto;margin:0 auto 27px}.prepared-by a{display:inline-flex;min-height:49px;align-items:center;gap:18px;border:1px solid var(--coral);border-radius:999px;padding:10px 22px;color:var(--coral);font-size:.72rem;font-weight:800;text-decoration:none;text-transform:uppercase}footer{border-top:1px solid var(--line);padding:24px max(20px,calc((100% - 690px)/2));color:#8a817a;font-size:.66rem;line-height:1.6;text-align:center}@media(min-width:640px){.site-header{justify-content:flex-start;padding-left:max(36px,calc((100% - 1180px)/2))}.trip-hero{padding-top:67px}.offer-card{padding:29px 30px}.offer-card h2{font-size:2.35rem}.trip-newsletter{padding:36px 38px}.trip-newsletter__stamp{top:30px;right:34px}.trip-newsletter__fields{grid-template-columns:minmax(0,1fr) 245px}}@media(prefers-reduced-motion:reduce){.trip-newsletter__fields button{transition:none}}`;
