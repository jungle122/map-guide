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
    document.getElementById("toggleAnnotator").hidden = !debugMode;
    var mapApi = window.MapModule.init(window.SPOT_DATA);
    window.AnnotatorModule.init(mapApi, window.SPOT_DATA);
    if (tileFallback) {
      var mapLoadStatus = document.getElementById("mapLoadStatus");
      mapLoadStatus.value = "高清分块地图加载失败，已切换普通模式。";
      mapLoadStatus.hidden = false;
    }
  });
})();
