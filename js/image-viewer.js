(function () {
  "use strict";

  function init() {
    var root = document.getElementById("imageViewer");
    var canvas = document.getElementById("imageViewerCanvas");
    var title = document.getElementById("imageViewerTitle");
    var counter = document.getElementById("imageViewerCounter");
    var error = document.getElementById("imageViewerError");
    var closeButton = document.getElementById("closeImageViewer");
    var previousButton = document.getElementById("previousImage");
    var nextButton = document.getElementById("nextImage");
    var zoomOutButton = document.getElementById("zoomOutImage");
    var fitButton = document.getElementById("fitImage");
    var zoomInButton = document.getElementById("zoomInImage");
    var spotModal = document.getElementById("spotModal");
    var viewer = null;
    var images = [];
    var currentIndex = 0;
    var lastTrigger = null;
    var swipeStart = null;
    var activePointers = new Set();

    function isOpen() {
      return !root.hidden;
    }

    function isAtHome() {
      if (!viewer || !viewer.viewport || !viewer.world.getItemCount()) return true;
      return viewer.viewport.getZoom(true) <= viewer.viewport.getHomeZoom() * 1.015;
    }

    function ensureViewer() {
      if (viewer) return viewer;
      viewer = window.OpenSeadragon({
        element: canvas,
        showNavigationControl: false,
        showSequenceControl: false,
        preserveViewport: false,
        visibilityRatio: 1,
        minZoomImageRatio: 1,
        maxZoomPixelRatio: 4,
        gestureSettingsMouse: {
          clickToZoom: false,
          dblClickToZoom: true,
          pinchToZoom: true,
          flickEnabled: true,
          scrollToZoom: true
        },
        gestureSettingsTouch: {
          clickToZoom: false,
          dblClickToZoom: true,
          pinchToZoom: true,
          flickEnabled: true
        }
      });
      viewer.addHandler("open", function () {
        canvas.classList.remove("has-error");
        canvas.classList.add("is-ready");
        error.hidden = true;
        viewer.viewport.goHome(true);
      });
      viewer.addHandler("open-failed", function () {
        canvas.classList.remove("is-ready");
        canvas.classList.add("has-error");
        error.hidden = false;
      });
      return viewer;
    }

    function updateNavigation() {
      var hasMultiple = images.length > 1;
      counter.value = images.length ? (currentIndex + 1) + " / " + images.length : "";
      previousButton.hidden = !hasMultiple;
      nextButton.hidden = !hasMultiple;
      previousButton.disabled = currentIndex === 0;
      nextButton.disabled = currentIndex === images.length - 1;
    }

    function showImage(index) {
      if (index < 0 || index >= images.length) return;
      currentIndex = index;
      updateNavigation();
      error.hidden = true;
      canvas.classList.remove("is-ready", "has-error");
      canvas.setAttribute("aria-label", "第 " + (index + 1) + " 张图片，可缩放和拖动");
      ensureViewer().open({ type: "image", url: images[index], buildPyramid: true });
    }

    function previous() {
      if (currentIndex > 0) showImage(currentIndex - 1);
      else fit();
    }

    function next() {
      if (currentIndex < images.length - 1) showImage(currentIndex + 1);
      else fit();
    }

    function fit() {
      if (viewer && viewer.viewport && viewer.world.getItemCount()) viewer.viewport.goHome(false);
    }

    function zoom(factor) {
      if (!viewer || !viewer.viewport || !viewer.world.getItemCount()) return;
      viewer.viewport.zoomBy(factor);
      viewer.viewport.applyConstraints();
    }

    function open(nextImages, index, trigger, nextTitle) {
      if (!Array.isArray(nextImages) || !nextImages.length) return;
      images = nextImages.slice();
      lastTrigger = trigger || document.activeElement;
      title.textContent = nextTitle || "图片查看";
      root.hidden = false;
      document.body.classList.add("image-viewer-open");
      if (spotModal && !spotModal.hidden) {
        spotModal.inert = true;
        spotModal.setAttribute("aria-hidden", "true");
      }
      requestAnimationFrame(function () {
        showImage(Math.min(Math.max(Number(index) || 0, 0), images.length - 1));
        closeButton.focus({ preventScroll: true });
      });
    }

    function close(options) {
      if (!isOpen()) return;
      var restoreFocus = !options || options.restoreFocus !== false;
      if (viewer) viewer.close();
      root.hidden = true;
      document.body.classList.remove("image-viewer-open");
      if (spotModal) {
        spotModal.inert = false;
        spotModal.removeAttribute("aria-hidden");
      }
      images = [];
      activePointers.clear();
      swipeStart = null;
      if (restoreFocus && lastTrigger && document.contains(lastTrigger)) {
        lastTrigger.focus({ preventScroll: true });
      }
      lastTrigger = null;
    }

    function focusableButtons() {
      return Array.from(root.querySelectorAll("button:not([hidden]):not(:disabled)"));
    }

    closeButton.addEventListener("click", function () { close(); });
    root.querySelectorAll("[data-close-image-viewer]").forEach(function (element) {
      element.addEventListener("click", function () { close(); });
    });
    previousButton.addEventListener("click", previous);
    nextButton.addEventListener("click", next);
    zoomOutButton.addEventListener("click", function () { zoom(1 / 1.4); });
    fitButton.addEventListener("click", fit);
    zoomInButton.addEventListener("click", function () { zoom(1.4); });

    canvas.addEventListener("pointerdown", function (event) {
      if (event.pointerType !== "touch") return;
      activePointers.add(event.pointerId);
      if (activePointers.size === 1) {
        swipeStart = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          time: Date.now(),
          atHome: isAtHome()
        };
      } else {
        swipeStart = null;
      }
    }, true);

    canvas.addEventListener("pointerup", function (event) {
      if (event.pointerType !== "touch") return;
      if (swipeStart && swipeStart.pointerId === event.pointerId && swipeStart.atHome && activePointers.size === 1) {
        var deltaX = event.clientX - swipeStart.x;
        var deltaY = event.clientY - swipeStart.y;
        var elapsed = Date.now() - swipeStart.time;
        if (elapsed < 700 && Math.abs(deltaX) > 56 && Math.abs(deltaX) > Math.abs(deltaY) * 1.25) {
          if (deltaX > 0) previous();
          else next();
        } else {
          fit();
        }
      }
      activePointers.delete(event.pointerId);
      swipeStart = null;
    }, true);

    canvas.addEventListener("pointercancel", function (event) {
      activePointers.delete(event.pointerId);
      swipeStart = null;
    }, true);

    document.addEventListener("keydown", function (event) {
      if (!isOpen()) return;
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopImmediatePropagation();
        close();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        previous();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        zoom(1.4);
      } else if (event.key === "-") {
        event.preventDefault();
        zoom(1 / 1.4);
      } else if (event.key === "0") {
        event.preventDefault();
        fit();
      } else if (event.key === "Tab") {
        var buttons = focusableButtons();
        if (!buttons.length) return;
        var first = buttons[0];
        var last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    window.ImageViewer = { open: open, close: close, isOpen: isOpen };
  }

  window.ImageViewerModule = { init: init };
})();
