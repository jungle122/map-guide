(function () {
  "use strict";

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    var input = document.createElement("textarea");
    input.value = text;
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    var successful = document.execCommand("copy");
    input.remove();
    return successful ? Promise.resolve() : Promise.reject(new Error("copy failed"));
  }

  function hasCoordinates(spot) {
    return Number.isFinite(spot.longitude) && Number.isFinite(spot.latitude);
  }

  window.AppUtils = {
    copyText: copyText,
    hasCoordinates: hasCoordinates
  };
})();
