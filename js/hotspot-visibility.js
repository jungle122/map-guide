(function () {
  "use strict";

  function init(mapApi) {
    var button = document.getElementById("toggleHotspots");
    var label = document.getElementById("toggleHotspotsLabel");
    var namesButton = document.getElementById("toggleHotspotNames");
    var namesLabel = document.getElementById("toggleHotspotNamesLabel");
    var viewport = mapApi && mapApi.viewport;
    var hidden = false;
    var namesVisible = false;

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

    function updateNames(nextVisible) {
      namesVisible = Boolean(nextVisible);
      viewport.classList.toggle("are-hotspot-names-visible", namesVisible);
      namesButton.setAttribute("aria-pressed", String(namesVisible));
      namesButton.setAttribute("aria-label", namesVisible ? "隐藏地图景点名称" : "显示地图景点名称");
      namesButton.title = namesVisible ? "隐藏地图景点名称" : "显示地图景点名称";
      namesLabel.textContent = namesVisible ? "隐藏名称" : "显示名称";
    }

    namesButton.addEventListener("click", function () {
      updateNames(!namesVisible);
    });

    update(false);
    updateNames(true);
    return {
      isHidden: function () { return hidden; },
      setHidden: update,
      areNamesVisible: function () { return namesVisible; },
      setNamesVisible: updateNames
    };
  }

  window.HotspotVisibilityModule = { init: init };
})();
