const CHECKOUT_URL = "https://buy.stripe.com/aFa7sL3Qafq82VZ0pZ2VG00";
const FALLBACK_CONTACT_URL = "mailto:podroz.martyna@gmail.com?subject=Kupuj%C4%99%20przewodnik%20po%20Lombardii&body=Chc%C4%99%20kupi%C4%87%20przewodnik%20po%20Lombardii%20za%2059%20z%C5%82.%0A%0AProsz%C4%99%20o%20instrukcj%C4%99%20p%C5%82atno%C5%9Bci%20i%20dost%C4%99p.";

function trackGuideEvent(eventName, placement = "page") {
  const detail = { event: eventName, product: "lombardia_guide", placement };
  window.dispatchEvent(new CustomEvent("martyna:analytics", { detail }));
  if (Array.isArray(window.dataLayer)) window.dataLayer.push(detail);
}

document.querySelectorAll("[data-checkout]").forEach((link, index) => {
  link.href = CHECKOUT_URL || FALLBACK_CONTACT_URL;
  link.addEventListener("click", () => trackGuideEvent("guide_checkout_click", index === 0 ? "hero" : "closing"));
});

trackGuideEvent("guide_view");
