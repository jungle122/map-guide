(function () {
  "use strict";

  window.SPOT_DATA = [];
  window.registerSpot = function (spot) {
    window.SPOT_DATA.push(spot);
  };
})();
