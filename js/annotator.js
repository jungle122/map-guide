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

  function init(mapApi) {
    var toggle = document.getElementById("toggleAnnotator");
    var closeButton = document.getElementById("closeAnnotator");
    var panel = document.getElementById("annotatorPanel");
    var xOutput = document.getElementById("coordinateX");
    var yOutput = document.getElementById("coordinateY");
    var copyCoordinate = document.getElementById("copyCoordinate");
    var polygonToggle = document.getElementById("togglePolygon");
    var copyPolygon = document.getElementById("copyPolygon");
    var clearPolygon = document.getElementById("clearPolygon");
    var status = document.getElementById("annotationStatus");
    var draft = document.getElementById("polygonDraft");
    var vertices = document.getElementById("polygonVertices");
    var current = null;
    var polygonPoints = [];
    var polygonMode = false;
    var downPoint = null;

    function setStatus(message) { status.value = message; }
    function format(point) { return "{ x: " + point.x.toFixed(2) + ", y: " + point.y.toFixed(2) + " }"; }

    function updatePoint(point) {
      current = point;
      xOutput.value = point.x.toFixed(2);
      yOutput.value = point.y.toFixed(2);
      copyCoordinate.disabled = false;
    }

    function renderPolygon() {
      draft.setAttribute("points", polygonPoints.map(function (point) { return point.x.toFixed(2) + "," + point.y.toFixed(2); }).join(" "));
      vertices.replaceChildren();
      polygonPoints.forEach(function (point) {
        var circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        circle.setAttribute("class", "polygon-vertex");
        circle.setAttribute("cx", point.x);
        circle.setAttribute("cy", point.y);
        circle.setAttribute("r", "0.65");
        vertices.appendChild(circle);
      });
      copyPolygon.disabled = polygonPoints.length < 3;
      clearPolygon.disabled = polygonPoints.length === 0;
    }

    function setEnabled(enabled) {
      mapApi.setAnnotating(enabled);
      toggle.setAttribute("aria-pressed", String(enabled));
      toggle.textContent = enabled ? "关闭标注" : "坐标标注";
      panel.hidden = !enabled;
      if (!enabled) {
        polygonMode = false;
        polygonToggle.setAttribute("aria-pressed", "false");
        polygonToggle.textContent = "开始记录多边形";
      }
    }

    toggle.addEventListener("click", function () { setEnabled(!mapApi.isAnnotating()); });
    closeButton.addEventListener("click", function () { setEnabled(false); toggle.focus({ preventScroll: true }); });

    mapApi.viewport.addEventListener("pointerdown", function (event) {
      if (!mapApi.isAnnotating() || event.target.closest(".hotspot")) return;
      downPoint = { x: event.clientX, y: event.clientY };
    });
    mapApi.viewport.addEventListener("pointerup", function (event) {
      if (!mapApi.isAnnotating() || !downPoint || event.target.closest(".hotspot")) return;
      if (Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y) < 5) {
        var point = mapApi.clientToPercent(event.clientX, event.clientY);
        updatePoint(point);
        if (polygonMode) {
          polygonPoints.push(point);
          renderPolygon();
          setStatus("已记录第 " + polygonPoints.length + " 个顶点。");
        } else {
          setStatus("已读取坐标 " + format(point));
        }
      }
      downPoint = null;
    });

    document.getElementById("hotspotLayer").querySelectorAll(".hotspot-anchor").forEach(function (marker) {
      var drag = null;
      marker.addEventListener("pointerdown", function (event) {
        if (!mapApi.isAnnotating() || !event.target.closest(".hotspot")) return;
        event.preventDefault();
        event.stopPropagation();
        marker.setPointerCapture(event.pointerId);
        drag = { startX: event.clientX, startY: event.clientY, moved: false };
        marker.querySelector(".hotspot").classList.add("is-dragging");
      });
      marker.addEventListener("pointermove", function (event) {
        if (!drag) return;
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3) drag.moved = true;
        var point = mapApi.clientToPercent(event.clientX, event.clientY);
        mapApi.setHotspotPosition(marker.dataset.spotId, point);
        updatePoint(point);
      });
      marker.addEventListener("pointerup", function () {
        if (!drag) return;
        marker.dataset.wasDragged = String(drag.moved);
        marker.querySelector(".hotspot").classList.remove("is-dragging");
        if (current) setStatus(marker.querySelector(".hotspot").getAttribute("aria-label").replace("查看", "") + " 已调整为 " + format(current));
        drag = null;
      });
    });

    copyCoordinate.addEventListener("click", function () {
      if (!current) return;
      copyText(format(current)).then(function () { setStatus("坐标已复制。"); }).catch(function () { setStatus("复制失败，请手动记录坐标。"); });
    });
    polygonToggle.addEventListener("click", function () {
      polygonMode = !polygonMode;
      polygonToggle.setAttribute("aria-pressed", String(polygonMode));
      polygonToggle.textContent = polygonMode ? "结束记录多边形" : "开始记录多边形";
      setStatus(polygonMode ? "请依次点击地图边界顶点。" : "多边形记录已暂停。");
    });
    copyPolygon.addEventListener("click", function () {
      var text = "[" + polygonPoints.map(function (point) { return "[" + point.x.toFixed(2) + ", " + point.y.toFixed(2) + "]"; }).join(", ") + "]";
      copyText(text).then(function () { setStatus("SVG 多边形顶点已复制。"); }).catch(function () { setStatus("复制失败，请手动记录顶点。"); });
    });
    clearPolygon.addEventListener("click", function () {
      polygonPoints = [];
      renderPolygon();
      setStatus("多边形顶点已清空。");
    });
  }

  window.AnnotatorModule = { init: init };
})();
