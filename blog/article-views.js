(() => {
  const counter = document.querySelector("[data-article-views]");
  const slug = counter?.dataset.articleViews;
  if (!counter || !slug) return;

  const label = (views) => {
    const ending = views === 1
      ? "wyświetlenie"
      : views % 10 >= 2 && views % 10 <= 4 && (views % 100 < 12 || views % 100 > 14)
        ? "wyświetlenia"
        : "wyświetleń";
    return `${new Intl.NumberFormat("pl-PL").format(views)} ${ending}`;
  };

  fetch(`/api/blog/views/${encodeURIComponent(slug)}`, {
    method: "POST",
    headers: { "Accept": "application/json" },
    credentials: "same-origin"
  })
    .then((response) => {
      if (!response.ok) throw new Error("view counter unavailable");
      return response.json();
    })
    .then(({ views }) => {
      if (!Number.isSafeInteger(views) || views < 1) return;
      counter.textContent = label(views);
      counter.hidden = false;
    })
    .catch(() => {
      // Licznik jest dodatkiem: awaria API nie powinna przeszkadzać w czytaniu.
    });
})();
