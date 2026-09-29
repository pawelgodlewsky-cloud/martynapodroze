(() => {
  const form = document.getElementById("inquiry-form");
  if (!form) return;
  const button = form.querySelector("button[type='submit']");
  const status = document.getElementById("inquiry-status");
  if (!button || !status) return;
  let pending = false;
  let submissionId = null;
  let previousFields = null;
  const originalLabel = button.innerHTML;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (pending || !form.reportValidity()) return;
    const fields = Object.fromEntries(new FormData(form));
    const snapshot = JSON.stringify(fields);
    if (snapshot !== previousFields || !submissionId) {
      submissionId = crypto.randomUUID();
      previousFields = snapshot;
    }
    pending = true;
    button.disabled = true;
    button.textContent = "Wysyłam…";
    form.setAttribute("aria-busy", "true");
    status.textContent = "Wysyłam zgłoszenie…";
    status.dataset.state = "pending";
    try {
      const response = await fetch(form.action, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...fields, submissionId }),
        signal: AbortSignal.timeout(15_000)
      });
      const result = await response.json();
      if (!response.ok || result.ok !== true) {
        throw new Error(result.error || "Nie udało się wysłać zgłoszenia. Spróbuj ponownie.");
      }
      status.dataset.state = "success";
      status.textContent = result.message;
      window.location.assign("/dziekujemy.html");
    } catch (error) {
      status.dataset.state = "error";
      status.textContent = error instanceof Error && error.name !== "TimeoutError" && error.name !== "AbortError" && error.name !== "TypeError" && error.name !== "SyntaxError"
        ? error.message
        : "Nie udało się potwierdzić wysłania. Twoje dane pozostają w formularzu. Spróbuj ponownie lub napisz na podroz.martyna@gmail.com.";
      status.focus({ preventScroll: true });
      status.scrollIntoView({ behavior: "smooth", block: "nearest" });
    } finally {
      pending = false;
      button.disabled = false;
      button.innerHTML = originalLabel;
      form.removeAttribute("aria-busy");
    }
  });
})();
