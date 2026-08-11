const form = document.querySelector("#login-form");
const notice = document.querySelector("#notice");
const button = form.querySelector("button");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  notice.hidden = true;
  button.disabled = true;
  try {
    const response = await fetch("/api/admin/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: document.querySelector("#email").value,
        password: document.querySelector("#password").value
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "Nie udało się zalogować.");
    location.replace("/admin/wyjazdy/");
  } catch (error) {
    notice.textContent = error instanceof Error ? error.message : "Nie udało się zalogować.";
    notice.hidden = false;
  } finally {
    button.disabled = false;
  }
});
