(() => {
  const consentName = "mp_cookie_consent";
  const analyticsValue = "analytics-v1";
  const necessaryValue = "necessary-v1";
  const maxAge = 60 * 60 * 24 * 180;

  const readConsent = () => {
    const prefix = `${consentName}=`;
    const part = document.cookie.split(";").map((item) => item.trim()).find((item) => item.startsWith(prefix));
    return part ? decodeURIComponent(part.slice(prefix.length)) : null;
  };

  const setConsent = (value) => {
    document.cookie = `${consentName}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; Secure; SameSite=Lax`;
  };

  const removeAnalyticsCookie = () => {
    document.cookie = "mp_visitor=; Path=/; Max-Age=0; Secure; SameSite=Lax";
  };

  const wrapper = document.createElement("section");
  wrapper.className = "cookie-consent";
  wrapper.setAttribute("role", "dialog");
  wrapper.setAttribute("aria-modal", "false");
  wrapper.setAttribute("aria-labelledby", "cookie-consent-title");
  wrapper.hidden = true;
  wrapper.innerHTML = `
    <div class="cookie-consent__content">
      <div>
        <p class="cookie-consent__eyebrow">Twoja prywatność</p>
        <h2 id="cookie-consent-title">Czy zgadzasz się na cookies statystyczne?</h2>
        <p>Cookies niezbędne obsługują wyłącznie bezpieczeństwo panelu i zapis Twojego wyboru. Opcjonalny cookie statystyczny pomaga policzyć wejścia i kliknięcia w ofertach — bez reklam i bez zapisywania pełnego adresu IP.</p>
        <a href="/polityka-prywatnosci.html#cookies">Polityka prywatności i cookies</a>
      </div>
      <div class="cookie-consent__actions">
        <button type="button" data-cookie-choice="necessary">Odrzucam opcjonalne</button>
        <button type="button" data-cookie-choice="analytics">Akceptuję statystyczne</button>
      </div>
    </div>`;
  document.body.append(wrapper);

  const open = () => {
    wrapper.hidden = false;
    wrapper.querySelector("button")?.focus({ preventScroll: true });
  };

  const close = () => {
    wrapper.hidden = true;
  };

  wrapper.addEventListener("click", (event) => {
    const button = event.target.closest("[data-cookie-choice]");
    if (!button) return;
    const previous = readConsent();
    const accepted = button.dataset.cookieChoice === "analytics";
    setConsent(accepted ? analyticsValue : necessaryValue);
    if (!accepted) removeAnalyticsCookie();
    close();
    document.dispatchEvent(new CustomEvent("mp:cookie-consent", { detail: { analytics: accepted } }));
    if (accepted && previous !== analyticsValue && document.body.dataset.cookieAnalytics === "worker") {
      location.reload();
    }
  });

  const settingsButtons = [...document.querySelectorAll("[data-cookie-settings]")];
  if (!settingsButtons.length) {
    const settings = document.createElement("button");
    settings.type = "button";
    settings.className = "cookie-settings";
    settings.textContent = "Ustawienia cookies";
    settings.setAttribute("data-cookie-settings", "");
    document.body.append(settings);
    settingsButtons.push(settings);
  }
  settingsButtons.forEach((button) => button.addEventListener("click", (event) => {
    event.preventDefault();
    open();
  }));

  const choice = readConsent();
  if (choice !== analyticsValue && choice !== necessaryValue) open();
  if (choice === necessaryValue) removeAnalyticsCookie();
})();
