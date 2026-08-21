(function () {
  "use strict";

  // Keep the interactive coordinate system aligned with the original map.
  // Hotspots use percentages, so their existing coordinates remain valid.
  var MAP_WIDTH = 8091;
  var MAP_HEIGHT = 5669;
  var INITIAL_FOCUS = { x: 0.45, y: 0.45 };
  var INITIAL_ZOOM = 1;

  function init(spots) {
    var viewport = document.getElementById("mapViewport");
    var canvas = document.getElementById("mapCanvas");
    var hotspotLayer = document.getElementById("hotspotLayer");
    var hotspotLabelLayer = document.getElementById("hotspotLabelLayer");
    var zoomValue = document.getElementById("zoomValue");
    var pointers = new Map();
    var state = { scale: 1, baseScale: 1, minScale: 0.4, maxScale: 3, x: 0, y: 0 };
    var dragOrigin = null;
    var pinchOrigin = null;
    var annotating = false;
    var suppressNextCanvasClick = false;

    function positionElement(element) {
      var x = Number(element.dataset.x);
      var y = Number(element.dataset.y);
      element.style.left = state.x + MAP_WIDTH * state.scale * x / 100 + "px";
      element.style.top = state.y + MAP_HEIGHT * state.scale * y / 100 + "px";
      if (element.classList.contains("hotspot-label")) element.classList.toggle("is-below", y < 14);
    }

    function render() {
      canvas.style.transform = "translate(" + state.x + "px," + state.y + "px) scale(" + state.scale + ")";
      zoomValue.value = Math.round((state.scale / state.baseScale) * 100) + "%";
      hotspotLayer.querySelectorAll(".hotspot-anchor").forEach(positionElement);
      hotspotLabelLayer.querySelectorAll(".hotspot-label").forEach(positionElement);
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
      // Allow users to reach the source image's native pixel density.
      state.maxScale = Math.max(1, state.baseScale * 3);
      // Keep the default viewport at 100%; the source pixels remain available on zoom.
      state.scale = Math.min(state.maxScale, state.baseScale * INITIAL_ZOOM);
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

    // 卡通图标映射表：景点ID -> 图标路径
    var SPOT_ICONS = {
      "longshi": "assets/icons/longshi.jpg",
      "jiyaxiang": "assets/icons/jiyaxiang.jpg",
      "shishijiao": "assets/icons/shishijiao.jpg",
      "tianhou-xiancan": "assets/icons/tianhou-xiancan.jpg"
    };

    spots.forEach(function (spot) {
      var anchor = document.createElement("div");
      anchor.className = "hotspot-anchor";
      anchor.dataset.spotId = spot.id;
      anchor.dataset.x = spot.x;
      anchor.dataset.y = spot.y;

      var marker = document.createElement("button");
      marker.type = "button";
      marker.className = "hotspot";
      marker.setAttribute("aria-label", "查看" + spot.name);

      // 添加卡通图标
      var labelHasIcon = false;
      var iconSrc = SPOT_ICONS[spot.id];
      if (iconSrc) {
        var iconImg = document.createElement("img");
        iconImg.className = "hotspot-icon";
        iconImg.src = iconSrc;
        iconImg.alt = spot.name;
        iconImg.draggable = false;
        marker.appendChild(iconImg);
        marker.classList.add("has-icon");
        labelHasIcon = true;
      }

      var label = document.createElement("span");
      label.className = "hotspot-label";
      if (labelHasIcon) label.classList.add("has-icon");
      label.textContent = spot.name;
      label.dataset.spotId = spot.id;
      label.dataset.x = spot.x;
      label.dataset.y = spot.y;
      label.classList.toggle("is-below", spot.y < 14);

      marker.addEventListener("click", function (event) {
        if (anchor.dataset.wasDragged === "true") {
          anchor.dataset.wasDragged = "false";
          return;
        }
        window.SpotCard.open(spot, event.currentTarget);
      });
      anchor.appendChild(marker);
      hotspotLayer.appendChild(anchor);
      hotspotLabelLayer.appendChild(label);
    });

    viewport.addEventListener("wheel", function (event) {
      event.preventDefault();
      zoomAt(state.scale * (event.deltaY < 0 ? 1.12 : 0.89), event.clientX, event.clientY);
    }, { passive: false });

    viewport.addEventListener("pointerdown", function (event) {
      if (event.target.closest(".hotspot")) return;
      viewport.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) {
        dragOrigin = { x: event.clientX - state.x, y: event.clientY - state.y, startX: event.clientX, startY: event.clientY, moved: false };
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
        suppressNextCanvasClick = Boolean(dragOrigin && dragOrigin.moved);
        viewport.classList.remove("is-dragging");
        dragOrigin = null;
        pinchOrigin = null;
      }
    }
    viewport.addEventListener("pointerup", releasePointer);
    viewport.addEventListener("pointercancel", releasePointer);
    viewport.addEventListener("click", function (event) {
      if (suppressNextCanvasClick) { suppressNextCanvasClick = false; return; }
      if (!annotating && !event.target.closest(".hotspot")) window.SpotCard.close();
    });

    document.getElementById("zoomIn").addEventListener("click", function () {
      var rect = viewport.getBoundingClientRect();
      zoomAt(state.scale * 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
    });
    document.getElementById("zoomOut").addEventListener("click", function () {
      var rect = viewport.getBoundingClientRect();
      zoomAt(state.scale / 1.2, rect.left + rect.width / 2, rect.top + rect.height / 2);
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
        if (marker) { marker.dataset.x = point.x; marker.dataset.y = point.y; positionElement(marker); }
        if (label) { label.dataset.x = point.x; label.dataset.y = point.y; positionElement(label); }
      }
    };
  }

  window.MapModule = { init: init };
})();
