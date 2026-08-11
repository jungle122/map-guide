(function () {
  "use strict";

  var MAP_WIDTH = 1080;
  var MAP_HEIGHT = 757;
  var INITIAL_FOCUS = { x: 0.42, y: 0.56 };

  function svgElement(name, attributes) {
    var element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.keys(attributes || {}).forEach(function (key) { element.setAttribute(key, attributes[key]); });
    return element;
  }

  function init(spots, regions) {
    var viewport = document.getElementById("mapViewport");
    var canvas = document.getElementById("mapCanvas");
    var hotspotLayer = document.getElementById("hotspotLayer");
    var hotspotLabelLayer = document.getElementById("hotspotLabelLayer");
    var regionLayer = document.getElementById("regionLayer");
    var zoomValue = document.getElementById("zoomValue");
    var contextTitle = document.getElementById("mapContextTitle");
    var contextHint = document.getElementById("mapContextHint");
    var contextSwatch = document.getElementById("contextSwatch");
    var clearRegionButton = document.getElementById("clearRegion");
    var pointers = new Map();
    var state = { scale: 1, baseScale: 1, minScale: 0.4, maxScale: 3, x: 0, y: 0 };
    var dragOrigin = null;
    var pinchOrigin = null;
    var annotating = false;
    var activeRegionId = null;
    var suppressNextCanvasClick = false;

    function positionHotspot(marker) {
      var x = Number(marker.dataset.x);
      var y = Number(marker.dataset.y);
      marker.style.left = state.x + MAP_WIDTH * state.scale * x / 100 + "px";
      marker.style.top = state.y + MAP_HEIGHT * state.scale * y / 100 + "px";
    }

    function positionLabel(label) {
      var x = Number(label.dataset.x);
      var y = Number(label.dataset.y);
      label.style.left = state.x + MAP_WIDTH * state.scale * x / 100 + "px";
      label.style.top = state.y + MAP_HEIGHT * state.scale * y / 100 + "px";
    }

    function render() {
      canvas.style.setProperty("--map-scale", state.scale);
      canvas.style.transform = "translate(" + state.x + "px," + state.y + "px) scale(" + state.scale + ")";
      zoomValue.value = Math.round((state.scale / state.baseScale) * 100) + "%";
      hotspotLayer.querySelectorAll(".hotspot-anchor").forEach(positionHotspot);
      hotspotLabelLayer.querySelectorAll(".hotspot-label").forEach(positionLabel);
    }

    function clamp() {
      var scaledWidth = MAP_WIDTH * state.scale;
      var scaledHeight = MAP_HEIGHT * state.scale;
      var minX = Math.min(0, viewport.clientWidth - scaledWidth);
      var minY = Math.min(0, viewport.clientHeight - scaledHeight);
      state.x = scaledWidth <= viewport.clientWidth ? (viewport.clientWidth - scaledWidth) / 2 : Math.min(0, Math.max(minX, state.x));
      state.y = scaledHeight <= viewport.clientHeight ? (viewport.clientHeight - scaledHeight) / 2 : Math.min(0, Math.max(minY, state.y));
    }

    function reset() {
      state.minScale = Math.min(viewport.clientWidth / MAP_WIDTH, viewport.clientHeight / MAP_HEIGHT);
      state.baseScale = Math.max(viewport.clientWidth / MAP_WIDTH, viewport.clientHeight / MAP_HEIGHT);
      state.maxScale = state.baseScale * 3;
      state.scale = state.baseScale;
      state.x = viewport.clientWidth / 2 - MAP_WIDTH * INITIAL_FOCUS.x * state.scale;
      state.y = viewport.clientHeight / 2 - MAP_HEIGHT * INITIAL_FOCUS.y * state.scale;
      clamp();
      render();
    }

    function clientToPercent(clientX, clientY) {
      var rect = viewport.getBoundingClientRect();
      return {
        x: Math.max(0, Math.min(100, ((clientX - rect.left - state.x) / state.scale / MAP_WIDTH) * 100)),
        y: Math.max(0, Math.min(100, ((clientY - rect.top - state.y) / state.scale / MAP_HEIGHT) * 100))
      };
    }

    function zoomAt(nextScale, clientX, clientY) {
      var rect = viewport.getBoundingClientRect();
      var localX = clientX - rect.left;
      var localY = clientY - rect.top;
      var mapX = (localX - state.x) / state.scale;
      var mapY = (localY - state.y) / state.scale;
      state.scale = Math.max(state.minScale, Math.min(state.maxScale, nextScale));
      state.x = localX - mapX * state.scale;
      state.y = localY - mapY * state.scale;
      clamp();
      render();
    }

    spots.forEach(function (spot) {
      var anchor = document.createElement("div");
      anchor.className = "hotspot-anchor";
      anchor.dataset.spotId = spot.id;
      anchor.dataset.regionId = spot.regionId || "";
      anchor.dataset.x = spot.x;
      anchor.dataset.y = spot.y;

      var marker = document.createElement("button");
      marker.type = "button";
      marker.className = "hotspot";
      marker.setAttribute("aria-label", "查看" + spot.name);
      var label = document.createElement("span");
      label.className = "hotspot-label";
      label.textContent = spot.name;
      label.dataset.spotId = spot.id;
      label.dataset.regionId = spot.regionId || "";
      label.dataset.x = spot.x;
      label.dataset.y = spot.y;
      marker.addEventListener("click", function (event) {
        if (anchor.dataset.wasDragged === "true") { anchor.dataset.wasDragged = "false"; return; }
        window.SpotCard.open(spot, event.currentTarget);
      });
      anchor.appendChild(marker);
      hotspotLayer.appendChild(anchor);
      hotspotLabelLayer.appendChild(label);
    });

    var mask = svgElement("mask", { id: "region-focus-mask", maskUnits: "userSpaceOnUse", x: "0", y: "0", width: "100", height: "100" });
    mask.appendChild(svgElement("rect", { x: "0", y: "0", width: "100", height: "100", fill: "white" }));
    var maskCutout = svgElement("polygon", { points: "", fill: "black" });
    mask.appendChild(maskCutout);
    var defs = svgElement("defs");
    defs.appendChild(mask);
    regionLayer.appendChild(defs);
    var dimmer = svgElement("rect", { class: "region-dimmer", x: "0", y: "0", width: "100", height: "100", mask: "url(#region-focus-mask)" });
    regionLayer.appendChild(dimmer);

    function polygonPoints(region) {
      return region.polygon.map(function (point) { return point.join(","); }).join(" ");
    }

    function clearRegion() {
      activeRegionId = null;
      maskCutout.setAttribute("points", "");
      regionLayer.classList.remove("has-active-region");
      regionLayer.querySelectorAll(".region-hotspot").forEach(function (polygon) { polygon.classList.remove("is-active"); });
      hotspotLayer.querySelectorAll(".hotspot-anchor").forEach(function (marker) { marker.classList.remove("is-muted", "is-related"); });
      hotspotLabelLayer.querySelectorAll(".hotspot-label").forEach(function (label) { label.classList.remove("is-muted", "is-related"); });
      contextTitle.textContent = "浏览整张地图";
      contextHint.textContent = "点击测试区域可查看点亮效果";
      contextSwatch.style.background = "";
      clearRegionButton.hidden = true;
    }

    function selectRegion(region, polygon) {
      window.SpotCard.close();
      if (activeRegionId === region.id) { clearRegion(); return; }
      activeRegionId = region.id;
      maskCutout.setAttribute("points", polygonPoints(region));
      regionLayer.classList.add("has-active-region");
      regionLayer.querySelectorAll(".region-hotspot").forEach(function (item) { item.classList.toggle("is-active", item === polygon); });
      hotspotLayer.querySelectorAll(".hotspot-anchor").forEach(function (marker) {
        var related = marker.dataset.regionId === region.id;
        marker.classList.toggle("is-related", related);
        marker.classList.toggle("is-muted", !related);
      });
      hotspotLabelLayer.querySelectorAll(".hotspot-label").forEach(function (label) {
        var related = label.dataset.regionId === region.id;
        label.classList.toggle("is-related", related);
        label.classList.toggle("is-muted", !related);
      });
      contextTitle.textContent = region.name;
      contextHint.textContent = region.hint;
      contextSwatch.style.background = region.color;
      clearRegionButton.hidden = false;
    }

    regions.forEach(function (region) {
      var polygon = svgElement("polygon", {
        points: polygonPoints(region),
        class: "region-hotspot",
        tabindex: "0",
        role: "button",
        "aria-label": "点亮" + region.name
      });
      polygon.dataset.regionId = region.id;
      polygon.addEventListener("keydown", function (event) {
        if (!annotating && (event.key === "Enter" || event.key === " ")) { event.preventDefault(); selectRegion(region, polygon); }
      });
      regionLayer.appendChild(polygon);
    });

    clearRegionButton.addEventListener("click", clearRegion);

    viewport.addEventListener("wheel", function (event) {
      event.preventDefault();
      zoomAt(state.scale * (event.deltaY < 0 ? 1.12 : 0.89), event.clientX, event.clientY);
    }, { passive: false });

    viewport.addEventListener("pointerdown", function (event) {
      if (event.target.closest(".hotspot")) return;
      var regionTarget = event.target.closest(".region-hotspot");
      viewport.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) {
        dragOrigin = {
          x: event.clientX - state.x,
          y: event.clientY - state.y,
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
          regionTarget: regionTarget
        };
      } else if (pointers.size === 2) {
        var points = Array.from(pointers.values());
        pinchOrigin = { distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y), scale: state.scale };
      }
      viewport.classList.add("is-dragging");
    });

    viewport.addEventListener("pointermove", function (event) {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2 && pinchOrigin) {
        if (dragOrigin) dragOrigin.moved = true;
        var points = Array.from(pointers.values());
        var distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        zoomAt(pinchOrigin.scale * distance / Math.max(1, pinchOrigin.distance), (points[0].x + points[1].x) / 2, (points[0].y + points[1].y) / 2);
      } else if (pointers.size === 1 && dragOrigin) {
        if (Math.hypot(event.clientX - dragOrigin.startX, event.clientY - dragOrigin.startY) > 4) dragOrigin.moved = true;
        if (!annotating || dragOrigin.moved) {
          state.x = event.clientX - dragOrigin.x;
          state.y = event.clientY - dragOrigin.y;
          clamp();
          render();
        }
      }
    });

    function releasePointer(event) {
      pointers.delete(event.pointerId);
      if (!pointers.size) {
        var clickedRegion = dragOrigin && !dragOrigin.moved && dragOrigin.regionTarget;
        suppressNextCanvasClick = Boolean(dragOrigin && (dragOrigin.moved || clickedRegion));
        if (clickedRegion && !annotating) {
          var region = regions.find(function (item) { return item.id === clickedRegion.dataset.regionId; });
          if (region) selectRegion(region, clickedRegion);
        }
        viewport.classList.remove("is-dragging");
        dragOrigin = null;
        pinchOrigin = null;
      }
    }
    viewport.addEventListener("pointerup", releasePointer);
    viewport.addEventListener("pointercancel", releasePointer);
    viewport.addEventListener("click", function (event) {
      if (suppressNextCanvasClick) { suppressNextCanvasClick = false; return; }
      if (!annotating && !event.target.closest(".region-hotspot, .hotspot")) {
        window.SpotCard.close();
        clearRegion();
      }
    });

    document.getElementById("zoomIn").addEventListener("click", function () {
      var rect = viewport.getBoundingClientRect(); zoomAt(state.scale * 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    document.getElementById("zoomOut").addEventListener("click", function () {
      var rect = viewport.getBoundingClientRect(); zoomAt(state.scale / 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    document.getElementById("resetView").addEventListener("click", reset);
    window.addEventListener("resize", reset);
    reset();

    return {
      viewport: viewport,
      clientToPercent: clientToPercent,
      setAnnotating: function (enabled) { annotating = enabled; viewport.classList.toggle("is-annotating", enabled); },
      isAnnotating: function () { return annotating; },
      setHotspotPosition: function (spotId, point) {
        var marker = hotspotLayer.querySelector('[data-spot-id="' + spotId + '"]');
        var label = hotspotLabelLayer.querySelector('[data-spot-id="' + spotId + '"]');
        if (marker) {
          marker.dataset.x = point.x;
          marker.dataset.y = point.y;
          positionHotspot(marker);
        }
        if (label) {
          label.dataset.x = point.x;
          label.dataset.y = point.y;
          positionLabel(label);
        }
      },
      clearRegion: clearRegion
    };
  }

  window.MapModule = { init: init };
})();
