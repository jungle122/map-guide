(function () {
  "use strict";

  function init() {
    var card = document.getElementById("spotQuickCard");
    var title = document.getElementById("spotCardTitle");
    var detailButton = document.getElementById("viewSpotDetail");
    var navigationButton = document.getElementById("openNavigation");
    var currentSpot = null;
    var currentTrigger = null;

    function hasCoordinates(spot) {
      return Number.isFinite(spot.longitude) && Number.isFinite(spot.latitude);
    }

    function open(spot, trigger) {
      currentSpot = spot;
      currentTrigger = trigger || document.activeElement;
      title.textContent = spot.name;
      navigationButton.classList.toggle("has-no-coordinate", !hasCoordinates(spot));
      card.hidden = false;
    }

    function close(options) {
      if (card.hidden) return;
      card.hidden = true;
      if (options && options.restoreFocus && currentTrigger) currentTrigger.focus({ preventScroll: true });
    }

    document.getElementById("closeSpotCard").addEventListener("click", function () { close({ restoreFocus: true }); });
    detailButton.addEventListener("click", function () {
      if (currentSpot) window.SpotModal.open(currentSpot, currentTrigger);
    });
    navigationButton.addEventListener("click", function () {
      if (currentSpot) window.NavigationChooser.open(currentSpot, navigationButton);
    });

    window.SpotCard = { open: open, close: close };
  }

  window.SpotCardModule = { init: init };
})();
