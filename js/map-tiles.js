(function () {
  "use strict";

  var LegacyMapModule = window.MapModule;
  var params = new URLSearchParams(window.location.search);
  if (params.get("map") === "legacy" || !window.OpenSeadragon || !LegacyMapModule) return;

  var MAP_WIDTH = 8091;
  var MAP_HEIGHT = 5669;
  var INITIAL_FOCUS = { x: 0.45, y: 0.45 };
  var TILE_SOURCE = "assets/map/tiles/v2/huanglian.dzi";
  var SPOT_ICONS = {
    "longshi": "assets/icons/longshi.jpg",
    "jiyaxiang": "assets/icons/jiyaxiang.jpg",
    "shishijiao": "assets/icons/shishijiao.jpg",
    "tianhou-xiancan": "assets/icons/tianhou-xiancan.jpg"
  };

  function init(spots) {
    var host = document.getElementById("mapViewport");
    var viewerElement = document.getElementById("mapViewer");
    var canvas = document.getElementById("mapCanvas");
    var hotspotLayer = document.getElementById("hotspotLayer");
    var zoomValue = document.getElementById("zoomValue");
    var anchors = [];
    var tiledImage = null;
    var homeZoom = 1;
    var annotating = false;
    var fallbackStarted = false;
    var failedTiles = 0;
    var resizeSnapshot = null;
    var resizeTimer = 0;
    var lastHotspotInteraction = 0;

    document.documentElement.classList.add("map-tiles-active");
    viewerElement.setAttribute("aria-hidden", "false");

    function fallbackToLegacy(reason) {
      if (fallbackStarted) return;
      fallbackStarted = true;
      console.warn("Tile map fallback:", reason);
      var fallbackUrl = new URL(window.location.href);
      fallbackUrl.searchParams.set("map", "legacy");
      fallbackUrl.searchParams.set("fallback", "tiles");
      window.location.replace(fallbackUrl.toString());
    }

    function createHotspot(spot) {
      var anchor = document.createElement("div");
      anchor.className = "hotspot-anchor";
      anchor.dataset.spotId = spot.id;
      anchor.dataset.x = spot.x;
      anchor.dataset.y = spot.y;

      var marker = document.createElement("button");
      marker.type = "button";
      marker.className = "hotspot";
      marker.setAttribute("aria-label", "查看" + spot.name);

      var iconSrc = SPOT_ICONS[spot.id];
      if (iconSrc) {
        var iconImg = document.createElement("img");
        iconImg.className = "hotspot-icon";
        iconImg.src = iconSrc;
        iconImg.alt = spot.name;
        iconImg.draggable = false;
        marker.appendChild(iconImg);
        marker.classList.add("has-icon");
      }

      var label = document.createElement("span");
      label.className = "hotspot-label" + (iconSrc ? " has-icon" : "");
      label.textContent = spot.name;
      label.dataset.spotId = spot.id;
      label.setAttribute("aria-hidden", "true");

      marker.addEventListener("click", function (event) {
        if (anchor.dataset.wasDragged === "true") {
          anchor.dataset.wasDragged = "false";
          return;
        }
        window.SpotCard.open(spot, event.currentTarget);
      });
      marker.addEventListener("pointerdown", function (event) {
        lastHotspotInteraction = window.performance.now();
        if (!annotating) event.stopPropagation();
      });

      anchor.appendChild(marker);
      anchor.appendChild(label);
      hotspotLayer.appendChild(anchor);
      anchors.push(anchor);
    }

    spots.forEach(createHotspot);

    var viewer = window.OpenSeadragon({
      element: viewerElement,
      tileSources: TILE_SOURCE,
      drawer: "canvas",
      showNavigationControl: false,
      tabIndex: -1,
      homeFillsViewer: true,
      constrainDuringPan: true,
      visibilityRatio: 1,
      maxZoomPixelRatio: 1,
      blendTime: 0.12,
      animationTime: 0.28,
      immediateRender: false,
      imageLoaderLimit: 6,
      maxImageCacheCount: 48,
      tileRetryMax: 2,
      tileRetryDelay: 500,
      preserveImageSizeOnResize: false,
      gestureSettingsMouse: {
        clickToZoom: false,
        dblClickToZoom: false,
        scrollToZoom: true,
        dragToPan: true
      },
      gestureSettingsTouch: {
        clickToZoom: false,
        dblClickToZoom: false,
        pinchToZoom: true,
        zoomToRefPoint: true,
        dragToPan: true,
        flickEnabled: false,
        pinchRotate: false
      }
    });

    function imagePoint(xPercent, yPercent) {
      return tiledImage.imageToViewportCoordinates(
        MAP_WIDTH * Number(xPercent) / 100,
        MAP_HEIGHT * Number(yPercent) / 100
      );
    }

    function updateUi() {
      if (!tiledImage || !viewer.viewport) return;
      var currentZoom = viewer.viewport.getZoom(true);
      var zoomRatio = currentZoom / homeZoom;
      var imageZoom = tiledImage.viewportToImageZoom(currentZoom);
      var hotspotScale = Math.max(0.55, Math.min(1, imageZoom * 5.1));
      viewerElement.style.setProperty("--hotspot-group-scale", hotspotScale.toFixed(3));
      host.dataset.zoomRatio = zoomRatio.toFixed(2);
      zoomValue.value = Math.round(zoomRatio * 100) + "%";
    }

    function updateMinZoom() {
      if (!tiledImage) return;
      var imageBounds = tiledImage.getBounds(true);
      var viewportAspect = viewer.viewport.getAspectRatio();
      var fittedViewportWidth = Math.max(
        imageBounds.width,
        imageBounds.height * viewportAspect
      );
      viewer.viewport.minZoomLevel = 1 / fittedViewportWidth;
    }

    function resetView(immediately) {
      if (!tiledImage) return;
      updateMinZoom();
      homeZoom = viewer.viewport.getHomeZoom();
      viewer.viewport.zoomTo(homeZoom, null, Boolean(immediately));
      viewer.viewport.panTo(imagePoint(INITIAL_FOCUS.x * 100, INITIAL_FOCUS.y * 100), Boolean(immediately));
      viewer.viewport.applyConstraints(Boolean(immediately));
      updateUi();
    }

    function addMapOverlays() {
      var fullImageBounds = tiledImage.imageToViewportRectangle(0, 0, MAP_WIDTH, MAP_HEIGHT);
      viewer.addOverlay({ element: canvas, location: fullImageBounds, checkResize: false });
      anchors.forEach(function (anchor) {
        viewer.addOverlay({
          element: anchor,
          location: imagePoint(anchor.dataset.x, anchor.dataset.y),
          placement: window.OpenSeadragon.Placement.TOP_LEFT,
          checkResize: false
        });
      });
    }

    viewer.addHandler("open", function () {
      tiledImage = viewer.world.getItemAt(0);
      if (!tiledImage) {
        fallbackToLegacy("DZI opened without a tiled image");
        return;
      }
      addMapOverlays();
      resetView(true);
    });

    viewer.addOnceHandler("tile-drawn", function () {
      document.documentElement.classList.add("map-tiles-ready");
    });

    viewer.addHandler("open-failed", function (event) {
      fallbackToLegacy(event.message || "DZI open failed");
    });

    viewer.addHandler("tile-load-failed", function (event) {
      if (!event.maxReached) return;
      failedTiles += 1;
      if (failedTiles >= 4) fallbackToLegacy("multiple tiles failed to load");
    });

    viewer.addHandler("animation", updateUi);
    viewer.addHandler("animation-finish", updateUi);
    viewer.addHandler("canvas-click", function (event) {
      var justUsedHotspot = window.performance.now() - lastHotspotInteraction < 500;
      if (event.quick && !annotating && !justUsedHotspot && !event.originalEvent.target.closest(".hotspot")) {
        window.SpotCard.close();
      }
    });

    document.getElementById("zoomIn").addEventListener("click", function () {
      if (!tiledImage) return;
      viewer.viewport.zoomBy(1.2);
      viewer.viewport.applyConstraints();
    });
    document.getElementById("zoomOut").addEventListener("click", function () {
      if (!tiledImage) return;
      viewer.viewport.zoomBy(1 / 1.2);
      viewer.viewport.applyConstraints();
    });
    document.getElementById("resetView").addEventListener("click", function () {
      resetView(false);
    });

    window.addEventListener("resize", function () {
      if (!tiledImage) return;
      if (!resizeSnapshot) {
        resizeSnapshot = {
          zoomRatio: viewer.viewport.getZoom(true) / homeZoom,
          imageCenter: tiledImage.viewportToImageCoordinates(viewer.viewport.getCenter(true))
        };
      }
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(function () {
        if (!resizeSnapshot || !tiledImage) return;
        updateMinZoom();
        homeZoom = viewer.viewport.getHomeZoom();
        viewer.viewport.zoomTo(homeZoom * resizeSnapshot.zoomRatio, null, true);
        viewer.viewport.panTo(
          tiledImage.imageToViewportCoordinates(resizeSnapshot.imageCenter),
          true
        );
        viewer.viewport.applyConstraints(true);
        resizeSnapshot = null;
        updateUi();
      }, 120);
    });

    return {
      viewport: host,
      clientToPercent: function (clientX, clientY) {
        if (!tiledImage) return { x: 50, y: 50 };
        var rect = viewerElement.getBoundingClientRect();
        var webPoint = new window.OpenSeadragon.Point(clientX - rect.left, clientY - rect.top);
        var viewportPoint = viewer.viewport.pointFromPixel(webPoint, true);
        var point = tiledImage.viewportToImageCoordinates(viewportPoint);
        return {
          x: Math.max(0, Math.min(100, point.x / MAP_WIDTH * 100)),
          y: Math.max(0, Math.min(100, point.y / MAP_HEIGHT * 100))
        };
      },
      setAnnotating: function (enabled) {
        annotating = enabled;
        host.classList.toggle("is-annotating", enabled);
      },
      isAnnotating: function () { return annotating; },
      getHotspotElements: function () { return anchors; },
      setHotspotPosition: function (spotId, point) {
        var anchor = anchors.find(function (item) { return item.dataset.spotId === spotId; });
        if (!anchor) return;
        anchor.dataset.x = point.x;
        anchor.dataset.y = point.y;
        if (tiledImage) {
          viewer.updateOverlay(
            anchor,
            imagePoint(point.x, point.y),
            window.OpenSeadragon.Placement.TOP_LEFT
          );
        }
      }
    };
  }

  window.MapModule = { init: init };
})();
