// Uzupełnij wyłącznie to pole, kiedy klientka potwierdzi lotnisko powrotne.
const departureAirport = "";

(() => {
  const airportNode = document.querySelector("#departure-airport");
  if (!airportNode) return;

  const confirmedAirport = departureAirport.trim();
  if (confirmedAirport) {
    airportNode.textContent = confirmedAirport;
  }
})();
