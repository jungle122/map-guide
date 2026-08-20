(function () {
  "use strict";

  var sheet = null;
  var backdrop = null;
  var openBtn = null;
  var closeBtn = null;
  var routeCards = null;

  function init() {
    openBtn = document.getElementById("openRouteEntry");
    sheet = document.getElementById("routeSheet");
    backdrop = sheet.querySelector(".route-backdrop");
    closeBtn = document.getElementById("closeRouteSheet");
    routeCards = sheet.querySelectorAll(".route-card");

    if (openBtn) openBtn.addEventListener("click", openSheet);
    if (backdrop) backdrop.addEventListener("click", closeSheet);
    if (closeBtn) closeBtn.addEventListener("click", closeSheet);

    routeCards.forEach(function (card) {
      card.addEventListener("click", function () {
        var routeId = card.dataset.routeId;
        var route = window.TOUR_ROUTES[routeId];
        if (!route) return;
        window.RouteLayer.render(route);
        closeSheet();
      });
    });

    var statusClose = document.getElementById("routeStatusClose");
    if (statusClose) statusClose.addEventListener("click", window.RouteLayer.clear);
  }

  function openSheet() {
    if (!sheet) return;
    sheet.hidden = false;
    document.body.classList.add("route-sheet-open");
  }

  function closeSheet() {
    if (!sheet) return;
    sheet.hidden = true;
    document.body.classList.remove("route-sheet-open");
  }

  window.RouteEntryModule = { init: init };
})();
