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

  function init() {
    var sheet = document.getElementById("navigationSheet");
    var title = document.getElementById("navigationTitle");
    var hint = document.getElementById("navigationHint");
    var status = document.getElementById("navigationStatus");
    var closeButton = document.getElementById("closeNavigation");
    var appleOption = sheet.querySelector("[data-apple-option]");
    var currentSpot = null;
    var lastTrigger = null;
    var isAppleDevice = /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);

    appleOption.hidden = !isAppleDevice;

    function hasCoordinates(spot) {
      return Number.isFinite(spot.longitude) && Number.isFinite(spot.latitude);
    }

    function open(spot, trigger) {
      currentSpot = spot;
      lastTrigger = trigger || document.activeElement;
      title.textContent = "前往" + spot.name;
      hint.textContent = hasCoordinates(spot)
        ? "请选择常用地图。微信内将优先使用可访问的网页路线。"
        : "该地点还没有真实经纬度，当前可预览导航入口，暂不会跳转。";
      status.value = "";
      sheet.querySelectorAll("[data-map-provider]").forEach(function (button) {
        button.classList.toggle("is-unavailable", !hasCoordinates(spot));
        button.setAttribute("aria-describedby", "navigationHint");
      });
      sheet.hidden = false;
      document.body.classList.add("navigation-open");
      closeButton.focus({ preventScroll: true });
    }

    function close() {
      if (sheet.hidden) return;
      sheet.hidden = true;
      document.body.classList.remove("navigation-open");
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    }

    sheet.querySelectorAll("[data-map-provider]").forEach(function (button) {
      button.addEventListener("click", function () {
        if (!currentSpot || !hasCoordinates(currentSpot)) {
          status.value = "真实坐标待补充，暂时不会跳转地图。";
          return;
        }
        status.value = "导航链接将在正式坐标确认后接入。";
      });
    });

    document.getElementById("copyPlaceInfo").addEventListener("click", function () {
      if (!currentSpot) return;
      var text = currentSpot.name;
      if (hasCoordinates(currentSpot)) text += " " + currentSpot.longitude + "," + currentSpot.latitude;
      copyText(text).then(function () { status.value = "地点信息已复制。"; }).catch(function () { status.value = "复制失败，请手动记录地点名称。"; });
    });
    closeButton.addEventListener("click", close);
    sheet.querySelectorAll("[data-close-navigation]").forEach(function (element) { element.addEventListener("click", close); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !sheet.hidden) close(); });

    window.NavigationChooser = { open: open, close: close };
  }

  window.NavigationModule = { init: init };
})();
