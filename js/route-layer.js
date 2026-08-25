(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var MAP_WIDTH = window.MapConfig.width;
  var MAP_HEIGHT = window.MapConfig.height;
  var routeLayer = null;

  function getOrCreateLayer() {
    if (routeLayer) return routeLayer;
    routeLayer = document.getElementById("routeLayer");
    if (routeLayer) return routeLayer;
    routeLayer = document.createElement("div");
    routeLayer.id = "routeLayer";
    routeLayer.className = "route-layer";
    routeLayer.setAttribute("aria-hidden", "true");
    var canvas = document.getElementById("mapCanvas");
    if (canvas) canvas.appendChild(routeLayer);
    return routeLayer;
  }

  function flattenPath(stops) {
    var points = [];
    for (var i = 0; i < stops.length; i++) {
      var stop = stops[i];
      if (i > 0 && stop.waypoints && stop.waypoints.length) {
        stop.waypoints.forEach(function (wp) {
          points.push(toCanvasX(wp[0]), toCanvasY(wp[1]));
        });
      }
      points.push(toCanvasX(stop.x), toCanvasY(stop.y));
    }
    return points;
  }

  function toCanvasX(percent) {
    return MAP_WIDTH * Number(percent) / 100;
  }

  function toCanvasY(percent) {
    return MAP_HEIGHT * Number(percent) / 100;
  }

  function renderRoute(route) {
    clearRoute();
    var layer = getOrCreateLayer();
    document.body.classList.add("route-active");

    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", "0 0 " + MAP_WIDTH + " " + MAP_HEIGHT);
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("class", "route-svg");

    var points = flattenPath(route.stops);
    var polyline = document.createElementNS(NS, "polyline");
    polyline.setAttribute("points", points.join(" "));
    polyline.setAttribute("class", "route-line");
    polyline.setAttribute("stroke", route.color);
    svg.appendChild(polyline);
    layer.appendChild(svg);

    route.stops.forEach(function (stop, index) {
      var offsetX = Number(stop.markerOffsetX) || 0;
      var offsetY = Number(stop.markerOffsetY) || 0;
      var offsetCanvasX = toCanvasX(offsetX);
      var offsetCanvasY = toCanvasY(offsetY);
      var markerX = toCanvasX(stop.x + offsetX);
      var markerY = toCanvasY(stop.y + offsetY);
      var labelSide = stop.labelSide || (stop.x + offsetX > 64 ? "left" : "right");
      var g = document.createElementNS(NS, "g");
      g.setAttribute("class", "route-stop");
      g.setAttribute("transform", "translate(" + markerX + "," + markerY + ")");

      if (offsetX || offsetY) {
        var leader = document.createElementNS(NS, "line");
        leader.setAttribute("class", "route-stop-leader");
        leader.setAttribute("x1", String(-offsetCanvasX));
        leader.setAttribute("y1", String(-offsetCanvasY));
        leader.setAttribute("x2", "0");
        leader.setAttribute("y2", "0");
        leader.setAttribute("stroke", route.color);
        g.appendChild(leader);
      }

      var circle = document.createElementNS(NS, "circle");
      circle.setAttribute("class", "route-stop-badge");
      circle.setAttribute("r", "52");
      circle.setAttribute("fill", route.color);
      g.appendChild(circle);

      var text = document.createElementNS(NS, "text");
      text.setAttribute("class", "route-stop-number");
      text.setAttribute("dy", "19");
      text.setAttribute("text-anchor", "middle");
      text.textContent = String(index + 1);
      g.appendChild(text);

      var label = document.createElementNS(NS, "rect");
      label.setAttribute("class", "route-stop-label");
      label.setAttribute("y", "-64");
      label.setAttribute("height", "128");
      label.setAttribute("rx", "30");
      label.setAttribute("fill", "#fffaf0");
      label.setAttribute("stroke", route.color);
      g.insertBefore(label, circle);

      var name = document.createElementNS(NS, "text");
      name.setAttribute("class", "route-stop-name");
      name.setAttribute("dy", "24");
      name.setAttribute("text-anchor", labelSide === "left" ? "end" : "start");
      name.textContent = stop.name;
      g.appendChild(name);

      svg.appendChild(g);

      var labelPadding = 28;
      var labelWidth = Math.ceil(name.getComputedTextLength() + labelPadding * 2);
      var labelX = labelSide === "left" ? -labelWidth - 72 : 72;
      label.setAttribute("x", String(labelX));
      label.setAttribute("width", String(labelWidth));
      name.setAttribute("x", String(labelSide === "left"
        ? labelX + labelWidth - labelPadding
        : labelX + labelPadding));

      // 同步添加一个不可见的隐藏标签，供调试/屏幕阅读器使用
      var title = document.createElementNS(NS, "title");
      title.textContent = (index + 1) + ". " + stop.name;
      g.appendChild(title);
    });

    updateStatusPill(route);
  }

  function clearRoute() {
    document.body.classList.remove("route-active");
    if (routeLayer) routeLayer.innerHTML = "";
    updateStatusPill(null);
  }

  function updateStatusPill(route) {
    var pill = document.getElementById("routeStatusPill");
    if (!pill) return;
    if (route) {
      pill.hidden = false;
      pill.querySelector(".route-status-name").textContent = route.name + " · 进行中";
      pill.querySelector(".route-status-duration").textContent = route.duration;
    } else {
      pill.hidden = true;
    }
  }

  window.RouteLayer = {
    render: renderRoute,
    clear: clearRoute
  };
})();
