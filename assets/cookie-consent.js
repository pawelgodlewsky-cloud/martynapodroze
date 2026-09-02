(() => {
  const consentName = "mp_cookie_consent";
  const analyticsValue = "analytics-v1";
  const necessaryValue = "necessary-v1";
  const maxAge = 60 * 60 * 24 * 180;
  const posthogToken = "phc_BFE8LRokqLUhN4EKRF2vdgGJ3U3BtFZ2ZsMeXrv5GWt4";
  const posthogHost = "https://eu.i.posthog.com";
  let posthogStarted = false;

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
    document.cookie.split(";").forEach((item) => {
      const name = item.split("=", 1)[0].trim();
      if (name.startsWith("ph_")) {
        document.cookie = `${name}=; Path=/; Max-Age=0; Secure; SameSite=Lax`;
      }
    });
    Object.keys(window.localStorage).filter((key) => key.startsWith("ph_") || key.includes("posthog")).forEach((key) => {
      window.localStorage.removeItem(key);
    });
  };

  const startPostHog = (force = false) => {
    if (posthogStarted || (!force && readConsent() !== analyticsValue)) return;
    posthogStarted = true;

    const posthog = window.posthog = window.posthog || [];
    if (!posthog.__SV) {
      posthog._i = [];
      posthog.init = (token, config, name = "posthog") => {
        const instance = name === "posthog" ? posthog : (posthog[name] = posthog[name] || []);
        const methods = "capture identify alias people.set people.set_once reset opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing register register_once unregister get_distinct_id get_session_id captureException".split(" ");
        methods.forEach((method) => {
          const parts = method.split(".");
          const target = parts.length === 2 ? (instance[parts[0]] = instance[parts[0]] || []) : instance;
          const key = parts.length === 2 ? parts[1] : parts[0];
          target[key] = (...args) => instance.push([method, ...args]);
        });
        posthog._i.push([token, config, name]);
      };
      posthog.__SV = 1;
    }

    const script = document.createElement("script");
    script.async = true;
    script.crossOrigin = "anonymous";
    script.src = `${posthogHost.replace(".i.posthog.com", "-assets.i.posthog.com")}/static/array.js`;
    document.head.append(script);

    posthog.init(posthogToken, {
      api_host: posthogHost,
      defaults: "2026-05-30",
      person_profiles: "identified_only",
      disable_session_recording: true,
      respect_dnt: true,
      persistence: "localStorage+cookie"
    });
  };

  document.addEventListener("martyna:analytics", (event) => {
    if (readConsent() !== analyticsValue) return;
    startPostHog();
    const detail = event.detail && typeof event.detail === "object" ? event.detail : {};
    const eventName = typeof detail.event === "string" ? detail.event : "martyna_interaction";
    const properties = { ...detail };
    delete properties.event;
    window.posthog?.capture?.(eventName, properties);
  });

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
    if (accepted) startPostHog(true);
    else {
      window.posthog?.opt_out_capturing?.();
      window.posthog?.reset?.();
      removeAnalyticsCookie();
      posthogStarted = false;
    }
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
  if (choice === analyticsValue) startPostHog();
  if (choice === necessaryValue) removeAnalyticsCookie();
})();
