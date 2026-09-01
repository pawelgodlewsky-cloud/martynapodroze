const CHECKOUT_URL = "https://buy.stripe.com/aFa7sL3Qafq82VZ0pZ2VG00";

function trackGuideEvent(eventName, placement = "page") {
  const detail = { event: eventName, product: "lombardia_guide", placement };
  window.dispatchEvent(new CustomEvent("martyna:analytics", { detail }));
  if (Array.isArray(window.dataLayer)) window.dataLayer.push(detail);
}

document.querySelectorAll("[data-checkout]").forEach((link, index) => {
  link.href = CHECKOUT_URL;
  link.addEventListener("click", () => trackGuideEvent("guide_checkout_click", index === 0 ? "hero" : "closing"));
});

trackGuideEvent("guide_view");
