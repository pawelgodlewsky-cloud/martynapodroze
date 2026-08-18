// Potwierdzone lotnisko powrotne klienta.
const departureAirport = "London Stansted Airport (STN)";

(() => {
  const airportNode = document.querySelector("#departure-airport");
  if (!airportNode) return;

  const confirmedAirport = departureAirport.trim();
  if (confirmedAirport) {
    airportNode.textContent = confirmedAirport;
  }
})();
