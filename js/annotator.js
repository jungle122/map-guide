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

  function init(mapApi, spots) {
    var toggle = document.getElementById("toggleAnnotator");
    var closeButton = document.getElementById("closeAnnotator");
    var panel = document.getElementById("annotatorPanel");
    var selector = document.getElementById("annotationSpot");
    var xOutput = document.getElementById("coordinateX");
    var yOutput = document.getElementById("coordinateY");
    var copyCoordinate = document.getElementById("copyCoordinate");
    var copyAllCoordinates = document.getElementById("copyAllCoordinates");
    var coordinateList = document.getElementById("coordinateList");
    var status = document.getElementById("annotationStatus");
    var positions = {};
    var currentSpotId = spots[0] ? spots[0].id : "";
    var downPoint = null;

    spots.forEach(function (spot) {
      positions[spot.id] = { x: spot.x, y: spot.y };
      var option = document.createElement("option");
      option.value = spot.id;
      option.textContent = spot.mapNumber + " · " + spot.name;
      selector.appendChild(option);
    });

    function currentSpot() {
      return spots.find(function (spot) { return spot.id === currentSpotId; });
    }

    function format(point) {
      return "{ x: " + point.x.toFixed(2) + ", y: " + point.y.toFixed(2) + " }";
    }

    function setStatus(message) { status.value = message; }

    function renderList() {
      coordinateList.replaceChildren();
      spots.forEach(function (spot) {
        var row = document.createElement("button");
        row.type = "button";
        row.className = "coordinate-row";
        row.classList.toggle("is-active", spot.id === currentSpotId);
        var point = positions[spot.id];
        var name = document.createElement("span");
        name.textContent = spot.mapNumber + " · " + spot.name;
        var value = document.createElement("code");
        value.textContent = point.x.toFixed(2) + ", " + point.y.toFixed(2);
        row.append(name, value);
        row.addEventListener("click", function () {
          selectSpot(spot.id);
          selector.focus({ preventScroll: true });
        });
        coordinateList.appendChild(row);
      });
    }

    function selectSpot(spotId) {
      currentSpotId = spotId;
      selector.value = spotId;
      var point = positions[spotId];
      if (point) {
        xOutput.value = point.x.toFixed(2);
        yOutput.value = point.y.toFixed(2);
        copyCoordinate.disabled = false;
      }
      renderList();
    }

    function updatePosition(spotId, point) {
      positions[spotId] = { x: point.x, y: point.y };
      mapApi.setHotspotPosition(spotId, point);
      selectSpot(spotId);
    }

    function setEnabled(enabled) {
      mapApi.setAnnotating(enabled);
      toggle.setAttribute("aria-pressed", String(enabled));
      toggle.textContent = enabled ? "关闭标注" : "坐标标注";
      panel.hidden = !enabled;
      if (enabled && currentSpotId) selectSpot(currentSpotId);
    }

    selector.addEventListener("change", function () {
      selectSpot(selector.value);
      setStatus("已选择“" + currentSpot().name + "”，请点击地图或拖动它的大头针。");
    });
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
        updatePosition(currentSpotId, point);
        setStatus("“" + currentSpot().name + "”已放置为 " + format(point));
      }
      downPoint = null;
    });

    document.getElementById("hotspotLayer").querySelectorAll(".hotspot-anchor").forEach(function (marker) {
      var drag = null;
      marker.addEventListener("pointerdown", function (event) {
        if (!mapApi.isAnnotating() || !event.target.closest(".hotspot")) return;
        event.preventDefault();
        event.stopPropagation();
        selectSpot(marker.dataset.spotId);
        marker.setPointerCapture(event.pointerId);
        drag = { startX: event.clientX, startY: event.clientY, moved: false };
        marker.querySelector(".hotspot").classList.add("is-dragging");
      });
      marker.addEventListener("pointermove", function (event) {
        if (!drag) return;
        if (Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) > 3) drag.moved = true;
        updatePosition(marker.dataset.spotId, mapApi.clientToPercent(event.clientX, event.clientY));
      });
      marker.addEventListener("pointerup", function () {
        if (!drag) return;
        marker.dataset.wasDragged = String(drag.moved);
        marker.querySelector(".hotspot").classList.remove("is-dragging");
        var spot = currentSpot();
        setStatus("“" + spot.name + "”已调整为 " + format(positions[spot.id]));
        drag = null;
      });
    });

    copyCoordinate.addEventListener("click", function () {
      var spot = currentSpot();
      var text = "x: " + positions[spot.id].x.toFixed(2) + ", y: " + positions[spot.id].y.toFixed(2);
      copyText(text).then(function () { setStatus("“" + spot.name + "”坐标已复制。"); }).catch(function () { setStatus("复制失败，请手动记录坐标。"); });
    });
    copyAllCoordinates.addEventListener("click", function () {
      var text = spots.map(function (spot) {
        var point = positions[spot.id];
        return spot.name + ": { x: " + point.x.toFixed(2) + ", y: " + point.y.toFixed(2) + " }";
      }).join("\n");
      copyText(text).then(function () { setStatus("四个景点坐标已全部复制。"); }).catch(function () { setStatus("复制失败，请逐项记录坐标。"); });
    });

    if (currentSpotId) selectSpot(currentSpotId);
  }

  window.AnnotatorModule = { init: init };
})();
