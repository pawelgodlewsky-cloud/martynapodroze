const newsletterForm = document.getElementById("trip-newsletter-form");

if (newsletterForm) {
  const emailInput = document.getElementById("trip-newsletter-email");
  const consentInput = document.getElementById("trip-newsletter-consent");
  const websiteInput = document.getElementById("trip-newsletter-website");
  const status = document.getElementById("trip-newsletter-status");
  const submitButton = newsletterForm.querySelector("button[type='submit']");

  newsletterForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";
    status.classList.remove("is-error");

    if (!newsletterForm.reportValidity()) return;

    submitButton.disabled = true;
    const originalLabel = submitButton.innerHTML;
    submitButton.textContent = "Zapisuję…";

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: emailInput.value,
          consent: consentInput.checked,
          website: websiteInput.value
        })
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Nie udało się zapisać. Spróbuj ponownie.");

      newsletterForm.reset();
      status.textContent = payload.message || "Sprawdź skrzynkę i potwierdź zapis do newslettera.";
    } catch (error) {
      status.classList.add("is-error");
      status.textContent = error instanceof Error ? error.message : "Nie udało się zapisać. Spróbuj ponownie.";
    } finally {
      submitButton.disabled = false;
      submitButton.innerHTML = originalLabel;
    }
  });
}
