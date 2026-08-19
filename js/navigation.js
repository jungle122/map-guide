(function () {
  "use strict";

  var GCJ_PI = 3.14159265358979324;
  var GCJ_A = 6378245.0;
  var GCJ_EE = 0.00669342162296594323;
  var SRC_NAME = "huanglian-map";

  function transformLat(x, y) {
    var ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * GCJ_PI) + 20.0 * Math.sin(2.0 * x * GCJ_PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(y * GCJ_PI) + 40.0 * Math.sin(y / 3.0 * GCJ_PI)) * 2.0 / 3.0;
    ret += (160.0 * Math.sin(y / 12.0 * GCJ_PI) + 320.0 * Math.sin(y * GCJ_PI / 30.0)) * 2.0 / 3.0;
    return ret;
  }

  function transformLng(x, y) {
    var ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20.0 * Math.sin(6.0 * x * GCJ_PI) + 20.0 * Math.sin(2.0 * x * GCJ_PI)) * 2.0 / 3.0;
    ret += (20.0 * Math.sin(x * GCJ_PI) + 40.0 * Math.sin(x / 3.0 * GCJ_PI)) * 2.0 / 3.0;
    ret += (150.0 * Math.sin(x / 12.0 * GCJ_PI) + 300.0 * Math.sin(x / 30.0 * GCJ_PI)) * 2.0 / 3.0;
    return ret;
  }

  function gcj02ToWgs84(lng, lat) {
    var dLat = transformLat(lng - 105.0, lat - 35.0);
    var dLng = transformLng(lng - 105.0, lat - 35.0);
    var radLat = lat / 180.0 * GCJ_PI;
    var magic = Math.sin(radLat);
    magic = 1 - GCJ_EE * magic * magic;
    var sqrtMagic = Math.sqrt(magic);
    dLat = (dLat * 180.0) / ((GCJ_A * (1 - GCJ_EE)) / (magic * sqrtMagic) * GCJ_PI);
    dLng = (dLng * 180.0) / (GCJ_A / sqrtMagic * Math.cos(radLat) * GCJ_PI);
    return { lng: lng - dLng, lat: lat - dLat };
  }

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

  function isMobileUA() {
    return /Android|iPhone|iPad|iPod|Mobile|HarmonyOS/i.test(navigator.userAgent);
  }

  function buildNavigationUrls(spot) {
    var lng = spot.longitude;
    var lat = spot.latitude;
    var name = spot.navName || spot.name;
    var wgs = gcj02ToWgs84(lng, lat);
    var baidu;
    if (isMobileUA()) {
      // 手机端：打开百度地图网页路线规划页（终点为景点 GCJ-02 坐标，百度自动换算 BD-09）
      baidu = "https://api.map.baidu.com/direction?destination=" + lat + "," + lng +
        "&coord_type=gcj02&mode=walking&region=" + encodeURIComponent("佛山市") +
        "&output=html&src=" + SRC_NAME;
    } else {
      // 电脑端：direction 接口缺起点会跳首页，改用 marker 页展示景点位置（可一键"到这去"）
      baidu = "https://api.map.baidu.com/marker?location=" + lat + "," + lng +
        "&title=" + encodeURIComponent(name) + "&content=" + encodeURIComponent(name) +
        "&coord_type=gcj02&output=html&src=" + SRC_NAME;
    }
    return {
      amap: "https://uri.amap.com/navigation?to=" + lng + "," + lat + "," + encodeURIComponent(name) +
        "&mode=walk&coordinate=gaode&callnative=0&src=" + SRC_NAME,
      baidu: baidu,
      tencent: "https://map.qq.com/?type=route&from=current&to=" + lat + "," + lng + "," +
        encodeURIComponent(name),
      apple: "https://maps.apple.com/?daddr=" + wgs.lat + "," + wgs.lng +
        "&q=" + encodeURIComponent(name) + "&dirflg=w"
    };
  }

  function openExternal(url) {
    var opened = null;
    try {
      opened = window.open(url, "_blank", "noopener");
    } catch (error) {
      opened = null;
    }
    if (!opened) {
      try {
        var link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener";
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
        setTimeout(function () { link.remove(); }, 0);
      } catch (error) {
        window.location.href = url;
      }
    }
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
      title.textContent = "前往" + (spot.navName || spot.name);
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
        var provider = button.getAttribute("data-map-provider");
        var providerLabel = button.querySelector("strong").textContent;
        var url = buildNavigationUrls(currentSpot)[provider];
        openExternal(url);
        status.value = "正在打开" + providerLabel + "网页路线；若没有跳转，可复制地点信息后手动搜索。";
      });
    });

    document.getElementById("copyPlaceInfo").addEventListener("click", function () {
      if (!currentSpot) return;
      var text = currentSpot.navName || currentSpot.name;
      if (hasCoordinates(currentSpot)) {
        text += " " + currentSpot.longitude + "," + currentSpot.latitude + "（GCJ-02）";
      }
      copyText(text).then(function () { status.value = "地点信息已复制。"; }).catch(function () { status.value = "复制失败，请手动记录地点名称。"; });
    });
    closeButton.addEventListener("click", close);
    sheet.querySelectorAll("[data-close-navigation]").forEach(function (element) { element.addEventListener("click", close); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape" && !sheet.hidden) close(); });

    window.NavigationChooser = { open: open, close: close };
  }

  window.NavigationModule = { init: init };
})();
