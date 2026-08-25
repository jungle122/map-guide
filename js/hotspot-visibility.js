(function () {
  "use strict";

  function init(mapApi) {
    var button = document.getElementById("toggleHotspots");
    var label = document.getElementById("toggleHotspotsLabel");
    var viewport = mapApi && mapApi.viewport;
    var hidden = false;

    function update(nextHidden) {
      hidden = Boolean(nextHidden);
      viewport.classList.toggle("is-immersive-view", hidden);
      button.setAttribute("aria-pressed", String(hidden));
      button.setAttribute("aria-label", hidden ? "显示地图选点" : "隐藏地图选点，沉浸看图");
      button.title = hidden ? "显示地图选点" : "隐藏地图选点，沉浸看图";
      label.textContent = hidden ? "显示选点" : "沉浸看图";
      if (hidden && window.SpotCard) window.SpotCard.close();
    }

    button.addEventListener("click", function () {
      update(!hidden);
    });

    update(false);
    return {
      isHidden: function () { return hidden; },
      setHidden: update
    };
  }

  window.HotspotVisibilityModule = { init: init };
})();
