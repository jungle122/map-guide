(function () {
  "use strict";

  var NS = "http://www.w3.org/2000/svg";
  var MAP_WIDTH = 8091;
  var MAP_HEIGHT = 5669;
  var CHAR_WIDTH = 180;
  var CHAR_HEIGHT = 260;

  var charEl = null;
  var animFrame = null;
  var pathPoints = [];
  var segDistances = [];
  var totalDistance = 0;
  var animStart = 0;
  var animDuration = 0;

  function clearChar() {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    if (charEl) { charEl.remove(); charEl = null; }
    pathPoints = [];
    segDistances = [];
    totalDistance = 0;
  }

  function buildPath(stops) {
    var pts = [];
    for (var i = 0; i < stops.length; i++) {
      var s = stops[i];
      if (i > 0 && s.waypoints && s.waypoints.length) {
        s.waypoints.forEach(function (wp) {
          pts.push({ x: MAP_WIDTH * wp[0] / 100, y: MAP_HEIGHT * wp[1] / 100 });
        });
      }
      pts.push({ x: MAP_WIDTH * s.x / 100, y: MAP_HEIGHT * s.y / 100 });
    }
    return pts;
  }

  function computeDistances(pts) {
    var dists = [0];
    var total = 0;
    for (var i = 1; i < pts.length; i++) {
      var d = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      total += d;
      dists.push(total);
    }
    return { segDistances: dists, total: total };
  }

  function startWalking(route) {
    clearChar();
    if (!route || !route.stops || route.stops.length < 2) return;

    pathPoints = buildPath(route.stops);
    var distInfo = computeDistances(pathPoints);
    segDistances = distInfo.segDistances;
    totalDistance = distInfo.total;

    // 匀速速度：全程约 10 秒
    animDuration = 10000;

    // 在路线 SVG 中添加小人
    var svg = document.querySelector(".route-svg");
    if (!svg) return;

    charEl = document.createElementNS(NS, "image");
    charEl.setAttribute("href", "assets/characters/walker.png");
    charEl.setAttribute("width", String(CHAR_WIDTH));
    charEl.setAttribute("height", String(CHAR_HEIGHT));
    charEl.setAttribute("class", "route-walker");
    charEl.style.opacity = "0";
    svg.appendChild(charEl);

    // 等一帧让浏览器渲染
    requestAnimationFrame(function () {
      charEl.style.opacity = "1";
      animStart = performance.now();
      tick();
    });
  }

  function tick() {
    var now = performance.now();
    var elapsed = now - animStart;
    var rawT = Math.min(1, elapsed / animDuration);
    // 匀速移动，不使用缓动
    var t = rawT;
    var targetDist = t * totalDistance;

    // 找到当前段
    var segIdx = 0;
    for (var i = 1; i < segDistances.length; i++) {
      if (segDistances[i] >= targetDist) { segIdx = i - 1; break; }
      if (i === segDistances.length - 1) segIdx = i - 1;
    }

    var segStart = segDistances[segIdx];
    var segEnd = segDistances[segIdx + 1];
    var segLen = segEnd - segStart;
    var segT = segLen > 0 ? (targetDist - segStart) / segLen : 0;

    var p0 = pathPoints[segIdx];
    var p1 = pathPoints[segIdx + 1];
    var cx = p0.x + (p1.x - p0.x) * segT;
    var cy = p0.y + (p1.y - p0.y) * segT;

    // 弹跳：均匀的轻微弹跳
    var bobPhase = elapsed / 350;
    var bobAmp = 10;
    var bob = Math.abs(Math.sin(bobPhase * Math.PI)) * bobAmp;

    // 朝向：根据移动方向翻转
    var dx = p1.x - p0.x;
    var flip = dx < 0 ? -1 : 1;

    var hw = CHAR_WIDTH / 2;
    var hh = CHAR_HEIGHT;

    charEl.setAttribute("transform",
      "translate(" + cx + "," + (cy - bob) + ") scale(" + flip + ",1) translate(" + (-hw) + "," + (-hh) + ")"
    );

    if (rawT < 1) {
      animFrame = requestAnimationFrame(tick);
    } else {
      // 到达终点，保持位置（轻微悬浮）
      charEl.setAttribute("transform",
        "translate(" + cx + "," + (cy - 4) + ") scale(" + flip + ",1) translate(" + (-hw) + "," + (-hh) + ")"
      );
    }
  }

  window.RouteWalker = {
    start: startWalking,
    stop: clearChar
  };
})();
