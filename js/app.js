(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    window.ModalModule.init();
    window.VillageIntroModule.init();
    window.NavigationModule.init();
    window.SpotCardModule.init();
    window.RouteEntryModule.init();
    var debugMode = new URLSearchParams(window.location.search).get("debug") === "1";
    var tileFallback = new URLSearchParams(window.location.search).get("fallback") === "tiles";
    var forceLegacyMap = new URLSearchParams(window.location.search).get("map") === "legacy";
    document.getElementById("toggleAnnotator").hidden = !debugMode;

    function openSpot(spot, trigger) {
      if (spot.openMode === "detail") {
        window.SpotCard.close();
        window.SpotModal.open(spot, trigger);
      } else {
        window.SpotCard.open(spot, trigger);
      }
    }

    var mapEngine = !forceLegacyMap && window.MapEngines.tiled
      ? window.MapEngines.tiled
      : window.MapEngines.legacy;
    var mapApi = mapEngine.init(window.SPOT_DATA, {
      onSpotActivate: openSpot,
      onBackgroundActivate: window.SpotCard.close
    });
    window.HotspotVisibilityModule.init(mapApi);
    window.AnnotatorModule.init(mapApi, window.SPOT_DATA);
    if (tileFallback) {
      var mapLoadStatus = document.getElementById("mapLoadStatus");
      mapLoadStatus.value = "高清分块地图加载失败，已切换普通模式。";
      mapLoadStatus.hidden = false;
    }
  });
})();
