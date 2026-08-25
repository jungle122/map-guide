(function () {
  "use strict";

  function init(mapApi, spots) {
    var toggle = document.getElementById("toggleAnnotator");
    var closeButton = document.getElementById("closeAnnotator");
    var panel = document.getElementById("annotatorPanel");
    var selector = document.getElementById("annotationSpot");
    var temporaryName = document.getElementById("temporarySpotName");
    var addTemporaryButton = document.getElementById("addTemporarySpot");
    var deleteCurrentButton = document.getElementById("deleteCurrentSpot");
    var clearTemporaryButton = document.getElementById("clearTemporarySpots");
    var resetSessionButton = document.getElementById("resetAnnotationSession");
    var xOutput = document.getElementById("coordinateX");
    var yOutput = document.getElementById("coordinateY");
    var copyCoordinate = document.getElementById("copyCoordinate");
    var copyAllCoordinates = document.getElementById("copyAllCoordinates");
    var coordinateList = document.getElementById("coordinateList");
    var status = document.getElementById("annotationStatus");
    var originalSpots = spots.slice();
    var activeSpots = spots.slice();
    var originalPositions = {};
    var positions = {};
    var currentSpotId = activeSpots[0] ? activeSpots[0].id : "";
    var temporaryCounter = 0;
    var downPoint = null;
    var activeDrag = null;

    originalSpots.forEach(function (spot) {
      originalPositions[spot.id] = { x: spot.x, y: spot.y };
      positions[spot.id] = { x: spot.x, y: spot.y };
    });

    function currentSpot() {
      return activeSpots.find(function (spot) { return spot.id === currentSpotId; });
    }

    function format(point) {
      return "{ x: " + point.x.toFixed(2) + ", y: " + point.y.toFixed(2) + " }";
    }

    function optionLabel(spot) {
      return spot.isTemporary ? "临时 · " + spot.name : spot.mapNumber + " · " + spot.name;
    }

    function setStatus(message) {
      status.value = message;
    }

    function renderSelector() {
      selector.replaceChildren();
      activeSpots.forEach(function (spot) {
        var option = document.createElement("option");
        option.value = spot.id;
        option.textContent = optionLabel(spot);
        selector.appendChild(option);
      });
      selector.value = currentSpotId;
      selector.disabled = activeSpots.length === 0;
    }

    function renderList() {
      coordinateList.replaceChildren();
      activeSpots.forEach(function (spot) {
        var row = document.createElement("button");
        row.type = "button";
        row.className = "coordinate-row";
        row.dataset.spotId = spot.id;
        row.classList.toggle("is-active", spot.id === currentSpotId);
        var point = positions[spot.id];
        var name = document.createElement("span");
        name.textContent = optionLabel(spot);
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

    function renderSelection() {
      var spot = currentSpot();
      var point = spot && positions[spot.id];
      renderSelector();
      if (point) {
        xOutput.value = point.x.toFixed(2);
        yOutput.value = point.y.toFixed(2);
        copyCoordinate.disabled = false;
        deleteCurrentButton.disabled = false;
      } else {
        xOutput.value = "--";
        yOutput.value = "--";
        copyCoordinate.disabled = true;
        deleteCurrentButton.disabled = true;
      }
      copyAllCoordinates.disabled = activeSpots.length === 0;
      clearTemporaryButton.disabled = !activeSpots.some(function (item) { return item.isTemporary; });
      renderList();
    }

    function selectSpot(spotId) {
      currentSpotId = activeSpots.some(function (spot) { return spot.id === spotId; }) ? spotId : "";
      renderSelection();
    }

    function renderPosition(spotId) {
      var point = positions[spotId];
      if (!point) return;
      if (spotId === currentSpotId) {
        xOutput.value = point.x.toFixed(2);
        yOutput.value = point.y.toFixed(2);
      }
      Array.from(coordinateList.children).some(function (row) {
        if (row.dataset.spotId !== spotId) return false;
        row.querySelector("code").textContent = point.x.toFixed(2) + ", " + point.y.toFixed(2);
        return true;
      });
    }

    function updatePosition(spotId, point) {
      if (!positions[spotId]) return;
      positions[spotId] = { x: point.x, y: point.y };
      mapApi.setHotspotPosition(spotId, point);
      if (currentSpotId !== spotId) selectSpot(spotId);
      else renderPosition(spotId);
    }

    function setEnabled(enabled) {
      mapApi.setAnnotating(enabled);
      toggle.setAttribute("aria-pressed", String(enabled));
      toggle.textContent = enabled ? "关闭标注" : "坐标标注";
      panel.hidden = !enabled;
      if (enabled) renderSelection();
    }

    function nextTemporaryId() {
      var id;
      do {
        temporaryCounter += 1;
        id = "debug-spot-" + temporaryCounter;
      } while (activeSpots.some(function (spot) { return spot.id === id; }));
      return id;
    }

    function addTemporarySpot() {
      var name = temporaryName.value.trim() || "临时点 " + (temporaryCounter + 1);
      var seed = currentSpotId && positions[currentSpotId] ? positions[currentSpotId] : { x: 50, y: 50 };
      var spot = {
        id: nextTemporaryId(),
        mapNumber: "临时",
        name: name,
        x: seed.x,
        y: seed.y,
        description: "调试模式临时点，刷新页面后自动消失。",
        isTemporary: true
      };
      activeSpots.push(spot);
      positions[spot.id] = { x: spot.x, y: spot.y };
      mapApi.addHotspot(spot);
      temporaryName.value = "";
      selectSpot(spot.id);
      setStatus("已新增“" + spot.name + "”，请点击地图放置或拖动大头针。");
    }

    function removeSpot(spotId) {
      var index = activeSpots.findIndex(function (spot) { return spot.id === spotId; });
      if (index < 0) return null;
      var removed = activeSpots[index];
      activeSpots.splice(index, 1);
      delete positions[spotId];
      mapApi.removeHotspot(spotId);
      if (window.SpotCard) window.SpotCard.close();
      var next = activeSpots[Math.min(index, activeSpots.length - 1)];
      selectSpot(next ? next.id : "");
      return removed;
    }

    function clearTemporarySpots() {
      var temporarySpots = activeSpots.filter(function (spot) { return spot.isTemporary; });
      if (!temporarySpots.length) {
        setStatus("当前没有临时点。");
        return;
      }
      temporarySpots.forEach(function (spot) {
        mapApi.removeHotspot(spot.id);
        delete positions[spot.id];
      });
      activeSpots = activeSpots.filter(function (spot) { return !spot.isTemporary; });
      if (!activeSpots.some(function (spot) { return spot.id === currentSpotId; })) {
        currentSpotId = activeSpots[0] ? activeSpots[0].id : "";
      }
      renderSelection();
      setStatus("已清空 " + temporarySpots.length + " 个临时点，正式点位的本次调整仍保留。");
    }

    function restoreInitialState() {
      activeSpots.forEach(function (spot) { mapApi.removeHotspot(spot.id); });
      activeSpots = originalSpots.slice();
      positions = {};
      originalSpots.forEach(function (spot) {
        positions[spot.id] = { x: originalPositions[spot.id].x, y: originalPositions[spot.id].y };
        mapApi.addHotspot(spot);
      });
      currentSpotId = activeSpots[0] ? activeSpots[0].id : "";
      downPoint = null;
      activeDrag = null;
      if (window.SpotCard) window.SpotCard.close();
      renderSelection();
      setStatus("已恢复页面打开时的全部正式点位，临时点和本次调整已清除。");
    }

    selector.addEventListener("change", function () {
      selectSpot(selector.value);
      var spot = currentSpot();
      if (spot) setStatus("已选择“" + spot.name + "”，请点击地图或拖动它的大头针。");
    });
    toggle.addEventListener("click", function () { setEnabled(!mapApi.isAnnotating()); });
    closeButton.addEventListener("click", function () { setEnabled(false); toggle.focus({ preventScroll: true }); });
    addTemporaryButton.addEventListener("click", addTemporarySpot);
    temporaryName.addEventListener("keydown", function (event) {
      if (event.key === "Enter") {
        event.preventDefault();
        addTemporarySpot();
      }
    });
    deleteCurrentButton.addEventListener("click", function () {
      var spot = currentSpot();
      if (!spot) return;
      var removed = removeSpot(spot.id);
      setStatus("“" + removed.name + "”已从当前页面移除，刷新或恢复初始状态后会重新出现。");
    });
    clearTemporaryButton.addEventListener("click", clearTemporarySpots);
    resetSessionButton.addEventListener("click", restoreInitialState);

    if (mapApi.onAnnotatorMapClick) {
      mapApi.onAnnotatorMapClick(function (point) {
        if (!mapApi.isAnnotating() || !currentSpot()) return;
        updatePosition(currentSpotId, point);
        setStatus("“" + currentSpot().name + "”已放置为 " + format(point));
      });
    } else {
      mapApi.viewport.addEventListener("pointerdown", function (event) {
        if (!mapApi.isAnnotating() || event.target.closest(".hotspot")) return;
        downPoint = { x: event.clientX, y: event.clientY };
      });
      mapApi.viewport.addEventListener("pointerup", function (event) {
        if (!mapApi.isAnnotating() || !downPoint || event.target.closest(".hotspot")) return;
        if (Math.hypot(event.clientX - downPoint.x, event.clientY - downPoint.y) < 5 && currentSpot()) {
          var point = mapApi.clientToPercent(event.clientX, event.clientY);
          updatePosition(currentSpotId, point);
          setStatus("“" + currentSpot().name + "”已放置为 " + format(point));
        }
        downPoint = null;
      });
    }

    mapApi.viewport.addEventListener("pointerdown", function (event) {
      var marker = event.target.closest(".hotspot-anchor");
      if (!mapApi.isAnnotating() || !marker || !event.target.closest(".hotspot")) return;
      event.preventDefault();
      event.stopPropagation();
      selectSpot(marker.dataset.spotId);
      marker.setPointerCapture(event.pointerId);
      activeDrag = {
        marker: marker,
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        moved: false
      };
      marker.querySelector(".hotspot").classList.add("is-dragging");
    }, true);

    mapApi.viewport.addEventListener("pointermove", function (event) {
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      if (Math.hypot(event.clientX - activeDrag.startX, event.clientY - activeDrag.startY) > 3) {
        activeDrag.moved = true;
      }
      updatePosition(activeDrag.marker.dataset.spotId, mapApi.clientToPercent(event.clientX, event.clientY));
    }, true);

    function finishDrag(event) {
      if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
      event.preventDefault();
      event.stopPropagation();
      var marker = activeDrag.marker;
      marker.dataset.wasDragged = String(activeDrag.moved);
      marker.querySelector(".hotspot").classList.remove("is-dragging");
      var spot = currentSpot();
      if (spot && positions[spot.id]) {
        setStatus("“" + spot.name + "”已调整为 " + format(positions[spot.id]));
      }
      activeDrag = null;
    }

    mapApi.viewport.addEventListener("pointerup", finishDrag, true);
    mapApi.viewport.addEventListener("pointercancel", finishDrag, true);
    mapApi.viewport.addEventListener("lostpointercapture", finishDrag, true);

    copyCoordinate.addEventListener("click", function () {
      var spot = currentSpot();
      if (!spot) return;
      var text = "x: " + positions[spot.id].x.toFixed(2) + ", y: " + positions[spot.id].y.toFixed(2);
      window.AppUtils.copyText(text).then(function () {
        setStatus("“" + spot.name + "”坐标已复制。");
      }).catch(function () {
        setStatus("复制失败，请手动记录坐标。");
      });
    });

    copyAllCoordinates.addEventListener("click", function () {
      var text = activeSpots.map(function (spot) {
        var point = positions[spot.id];
        return spot.name + ": { x: " + point.x.toFixed(2) + ", y: " + point.y.toFixed(2) + " }";
      }).join("\n");
      window.AppUtils.copyText(text).then(function () {
        setStatus(activeSpots.length + "个点位坐标已全部复制。");
      }).catch(function () {
        setStatus("复制失败，请逐项记录坐标。");
      });
    });

    renderSelection();
  }

  window.AnnotatorModule = { init: init };
})();
