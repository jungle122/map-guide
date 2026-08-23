(function () {
  "use strict";

  function init() {
    var card = document.getElementById("spotQuickCard");
    var title = document.getElementById("spotCardTitle");
    var icon = document.getElementById("spotCardIcon");
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
      navigationButton.classList.toggle("has-no-coordinate", !hasCoordinates(spot));

      // 设置卡通图标：从 SPOT_ICONS 映射表取对应图标
      if (window.SPOT_ICONS && window.SPOT_ICONS[spot.id]) {
        icon.src = window.SPOT_ICONS[spot.id];
        icon.hidden = false;
      } else {
        icon.hidden = true;
      }

      // 显示地点名称
      title.textContent = spot.name;

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
