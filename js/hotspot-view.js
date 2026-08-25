(function () {
  "use strict";

  function create(spot, options) {
    var settings = options || {};
    var anchor = document.createElement("div");
    anchor.className = "hotspot-anchor";
    if (spot.isTemporary) anchor.classList.add("is-temporary");
    if (spot.isSecondary) anchor.classList.add("is-secondary");
    anchor.dataset.spotId = spot.id;
    anchor.dataset.x = spot.x;
    anchor.dataset.y = spot.y;

    var marker = document.createElement("button");
    marker.type = "button";
    marker.className = "hotspot";
    marker.setAttribute("aria-label", "查看" + spot.name);

    var iconSrc = window.MapConfig.spotIcons[spot.id];
    if (iconSrc) {
      var icon = document.createElement("img");
      icon.className = "hotspot-icon";
      icon.src = iconSrc;
      icon.alt = spot.name;
      icon.draggable = false;
      marker.appendChild(icon);
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
      if (settings.onActivate) settings.onActivate(spot, event.currentTarget);
    });
    if (settings.onPointerDown) marker.addEventListener("pointerdown", settings.onPointerDown);

    anchor.appendChild(marker);
    anchor.appendChild(label);
    return anchor;
  }

  window.HotspotView = { create: create };
})();
