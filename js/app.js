(function () {
  "use strict";

  document.addEventListener("DOMContentLoaded", function () {
    window.ModalModule.init();
    window.NavigationModule.init();
    window.SpotCardModule.init();
    var debugMode = new URLSearchParams(window.location.search).get("debug") === "1";
    document.getElementById("toggleAnnotator").hidden = !debugMode;
    var mapApi = window.MapModule.init(window.SPOT_DATA);
    window.AnnotatorModule.init(mapApi, window.SPOT_DATA);
  });
})();
