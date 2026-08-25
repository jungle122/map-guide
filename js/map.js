(function () {
  "use strict";

  var MAP_WIDTH = window.MapConfig.width;
  var MAP_HEIGHT = window.MapConfig.height;
  var INITIAL_FOCUS = window.MapConfig.initialFocus;
  var INITIAL_ZOOM = window.MapConfig.initialZoom;

  function init(spots, options) {
    var settings = options || {};
    var viewport = document.getElementById("mapViewport");
    var canvas = document.getElementById("mapCanvas");
    var mapImage = canvas.querySelector(".map-image");
    if (!mapImage.getAttribute("src") && mapImage.dataset.previewSrc) {
      mapImage.src = mapImage.dataset.previewSrc;
    }
    var hotspotLayer = document.getElementById("hotspotLayer");
    var zoomValue = document.getElementById("zoomValue");
    var pointers = new Map();
    var state = { scale: 1, baseScale: 1, minScale: 0.4, maxScale: 3, x: 0, y: 0 };
    var dragOrigin = null;
    var pinchOrigin = null;
    var annotating = false;
    var suppressNextCanvasClick = false;
    var initialized = false;
    var fullImageRequested = false;
    var resizeFrame = 0;

    function requestFullImage() {
      var fullSrc = mapImage.dataset.fullSrc;
      if (!fullSrc || fullImageRequested) return;
      fullImageRequested = true;

      var fullImage = new Image();
      fullImage.decoding = "async";
      fullImage.onload = function () {
        mapImage.src = fullSrc;
        mapImage.removeAttribute("data-full-src");
        mapImage.classList.add("is-full-resolution");
      };
      fullImage.onerror = function () {
        fullImageRequested = false;
      };
      fullImage.src = fullSrc;
    }

    function positionElement(element) {
      var x = Number(element.dataset.x);
      var y = Number(element.dataset.y);
      element.style.left = state.x + MAP_WIDTH * state.scale * x / 100 + "px";
      element.style.top = state.y + MAP_HEIGHT * state.scale * y / 100 + "px";
    }

    function render() {
      var zoomRatio = state.scale / state.baseScale;
      viewport.style.setProperty("--hotspot-group-scale", zoomRatio.toFixed(3));
      viewport.dataset.zoomRatio = zoomRatio.toFixed(2);
      canvas.style.transform = "translate(" + state.x + "px," + state.y + "px) scale(" + state.scale + ")";
      zoomValue.value = Math.round(zoomRatio * 100) + "%";
      hotspotLayer.querySelectorAll(".hotspot-anchor").forEach(positionElement);
      if (zoomRatio >= 1.35) requestFullImage();
    }

    function clamp() {
      var scaledWidth = MAP_WIDTH * state.scale;
      var scaledHeight = MAP_HEIGHT * state.scale;
      var minX = Math.min(0, viewport.clientWidth - scaledWidth);
      var minY = Math.min(0, viewport.clientHeight - scaledHeight);
      state.x = scaledWidth <= viewport.clientWidth ? (viewport.clientWidth - scaledWidth) / 2 : Math.min(0, Math.max(minX, state.x));
      state.y = scaledHeight <= viewport.clientHeight ? (viewport.clientHeight - scaledHeight) / 2 : Math.min(0, Math.max(minY, state.y));
    }

    function updateScaleBounds() {
      state.minScale = Math.min(viewport.clientWidth / MAP_WIDTH, viewport.clientHeight / MAP_HEIGHT);
      state.baseScale = Math.max(viewport.clientWidth / MAP_WIDTH, viewport.clientHeight / MAP_HEIGHT);
      // Allow users to reach the source image's native pixel density.
      state.maxScale = Math.max(1, state.baseScale * 3);
    }

    function reset() {
      updateScaleBounds();
      // Keep the default viewport at 100%; the source pixels remain available on zoom.
      state.scale = Math.min(state.maxScale, state.baseScale * INITIAL_ZOOM);
      state.x = viewport.clientWidth / 2 - MAP_WIDTH * INITIAL_FOCUS.x * state.scale;
      state.y = viewport.clientHeight / 2 - MAP_HEIGHT * INITIAL_FOCUS.y * state.scale;
      clamp();
      render();
      initialized = true;
    }

    function preserveViewOnResize() {
      if (!initialized || !viewport.clientWidth || !viewport.clientHeight) return;
      var mapCenterX = (viewport.clientWidth / 2 - state.x) / state.scale;
      var mapCenterY = (viewport.clientHeight / 2 - state.y) / state.scale;
      var zoomRatio = state.scale / state.baseScale;
      updateScaleBounds();
      state.scale = Math.max(state.minScale, Math.min(state.maxScale, state.baseScale * zoomRatio));
      state.x = viewport.clientWidth / 2 - mapCenterX * state.scale;
      state.y = viewport.clientHeight / 2 - mapCenterY * state.scale;
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

    function beginPinch() {
      var points = Array.from(pointers.values()).slice(0, 2);
      if (points.length < 2) return;
      var rect = viewport.getBoundingClientRect();
      var midpointX = (points[0].x + points[1].x) / 2 - rect.left;
      var midpointY = (points[0].y + points[1].y) / 2 - rect.top;
      pinchOrigin = {
        distance: Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y),
        scale: state.scale,
        mapX: (midpointX - state.x) / state.scale,
        mapY: (midpointY - state.y) / state.scale
      };
      dragOrigin = null;
    }

    function createHotspot(spot) {
      var existing = hotspotLayer.querySelector('.hotspot-anchor[data-spot-id="' + spot.id + '"]');
      if (existing) return existing;
      var anchor = window.HotspotView.create(spot, {
        onActivate: settings.onSpotActivate
      });
      hotspotLayer.appendChild(anchor);
      if (initialized) positionElement(anchor);
      return anchor;
    }

    function removeHotspot(spotId) {
      var anchor = hotspotLayer.querySelector('.hotspot-anchor[data-spot-id="' + spotId + '"]');
      if (anchor) anchor.remove();
    }

    spots.forEach(createHotspot);

    viewport.addEventListener("wheel", function (event) {
      event.preventDefault();
      zoomAt(state.scale * (event.deltaY < 0 ? 1.12 : 0.89), event.clientX, event.clientY);
    }, { passive: false });

    viewport.addEventListener("pointerdown", function (event) {
      if (event.target.closest(".hotspot") && pointers.size === 0) return;
      viewport.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 1) {
        dragOrigin = { x: event.clientX - state.x, y: event.clientY - state.y, startX: event.clientX, startY: event.clientY, moved: false };
      } else if (pointers.size === 2) {
        beginPinch();
      }
      viewport.classList.add("is-dragging");
    });

    viewport.addEventListener("pointermove", function (event) {
      if (!pointers.has(event.pointerId)) return;
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (pointers.size === 2 && pinchOrigin) {
        var points = Array.from(pointers.values());
        var distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
        var rect = viewport.getBoundingClientRect();
        var midpointX = (points[0].x + points[1].x) / 2 - rect.left;
        var midpointY = (points[0].y + points[1].y) / 2 - rect.top;
        state.scale = Math.max(state.minScale, Math.min(state.maxScale, pinchOrigin.scale * distance / Math.max(1, pinchOrigin.distance)));
        state.x = midpointX - pinchOrigin.mapX * state.scale;
        state.y = midpointY - pinchOrigin.mapY * state.scale;
        suppressNextCanvasClick = true;
        clamp();
        render();
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
      if (!pointers.has(event.pointerId)) return;
      var wasPinching = pointers.size >= 2;
      pointers.delete(event.pointerId);
      if (wasPinching && pointers.size === 1) {
        var remaining = Array.from(pointers.values())[0];
        dragOrigin = {
          x: remaining.x - state.x,
          y: remaining.y - state.y,
          startX: remaining.x,
          startY: remaining.y,
          moved: true
        };
        pinchOrigin = null;
        suppressNextCanvasClick = true;
      } else if (!pointers.size) {
        suppressNextCanvasClick = Boolean(dragOrigin && dragOrigin.moved);
        viewport.classList.remove("is-dragging");
        dragOrigin = null;
        pinchOrigin = null;
      }
    }
    viewport.addEventListener("pointerup", releasePointer);
    viewport.addEventListener("pointercancel", releasePointer);
    viewport.addEventListener("lostpointercapture", releasePointer);
    viewport.addEventListener("click", function (event) {
      if (suppressNextCanvasClick) { suppressNextCanvasClick = false; return; }
      if (!annotating && !event.target.closest(".hotspot") && settings.onBackgroundActivate) {
        settings.onBackgroundActivate();
      }
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
    window.addEventListener("resize", function () {
      window.cancelAnimationFrame(resizeFrame);
      resizeFrame = window.requestAnimationFrame(preserveViewOnResize);
    });
    reset();

    return {
      viewport: viewport,
      clientToPercent: clientToPercent,
      setAnnotating: function (enabled) { annotating = enabled; viewport.classList.toggle("is-annotating", enabled); },
      isAnnotating: function () { return annotating; },
      getHotspotElements: function () { return Array.from(hotspotLayer.querySelectorAll(".hotspot-anchor")); },
      addHotspot: createHotspot,
      removeHotspot: removeHotspot,
      setHotspotPosition: function (spotId, point) {
        var anchor = hotspotLayer.querySelector('.hotspot-anchor[data-spot-id="' + spotId + '"]');
        if (anchor) { anchor.dataset.x = point.x; anchor.dataset.y = point.y; positionElement(anchor); }
      }
    };
  }

  window.MapEngines = window.MapEngines || {};
  window.MapEngines.legacy = { init: init };
})();
