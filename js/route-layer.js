(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var routeLayer = null;
  var activeRouteId = null;
  var activeStopMarkers = [];

  function getOrCreateLayer() {
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
          points.push(wp[0], wp[1]);
        });
      }
      points.push(stop.x, stop.y);
    }
    return points;
  }

  function renderRoute(route) {
    clearRoute();
    var layer = getOrCreateLayer();
    activeRouteId = route.id;

    var svg = document.createElementNS(NS, "svg");
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("viewBox", "0 0 100 100");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.setAttribute("class", "route-svg");

    var points = flattenPath(route.stops);
    var polyline = document.createElementNS(NS, "polyline");
    polyline.setAttribute("points", points.join(" "));
    polyline.setAttribute("class", "route-line");
    polyline.setAttribute("stroke", route.color);
    svg.appendChild(polyline);

    route.stops.forEach(function (stop, index) {
      var g = document.createElementNS(NS, "g");
      g.setAttribute("class", "route-stop");
      g.setAttribute("transform", "translate(" + stop.x + "," + stop.y + ")");

      var circle = document.createElementNS(NS, "circle");
      circle.setAttribute("r", "0.85");
      circle.setAttribute("fill", route.color);
      circle.setAttribute("stroke", "#fff");
      circle.setAttribute("stroke-width", "0.25");
      g.appendChild(circle);

      var text = document.createElementNS(NS, "text");
      text.setAttribute("dy", "0.32");
      text.setAttribute("text-anchor", "middle");
      text.setAttribute("fill", "#fff");
      text.setAttribute("font-size", "1");
      text.setAttribute("font-weight", "700");
      text.textContent = String(index + 1);
      g.appendChild(text);

      svg.appendChild(g);

      // 同步添加一个不可见的隐藏标签，供调试/屏幕阅读器使用
      var title = document.createElementNS(NS, "title");
      title.textContent = (index + 1) + ". " + stop.name;
      g.appendChild(title);
    });

    layer.appendChild(svg);
    activeStopMarkers = route.stops.slice();
    updateStatusPill(route);
  }

  function clearRoute() {
    activeRouteId = null;
    activeStopMarkers = [];
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

  function isActive(routeId) {
    return activeRouteId === routeId;
  }

  function getActiveRoute() {
    return activeRouteId;
  }

  window.RouteLayer = {
    render: renderRoute,
    clear: clearRoute,
    isActive: isActive,
    getActiveRoute: getActiveRoute
  };
})();
