(function () {
  "use strict";

  // 路线数据来源：「云赏黄连」小程序游玩线路推荐。
  // 站点坐标为用户通过坐标标注工具在校准后的手绘导览图上标注的百分比位置。

  window.TOUR_ROUTES = {
    halfDay: {
      id: "halfDay",
      name: "半日游",
      duration: "约 3 小时",
      color: "#b94e3d",
      stops: [
        { id: "village-history-hall", name: "黄连村史馆", x: 48.94, y: 81.05 },
        { id: "visitor-center", name: "游客服务中心", x: 38.26, y: 82.90 },
        { id: "chef-museum", name: "顺德厨师文化展示馆", x: 32.15, y: 92.51 },
        { id: "xuepu-school", name: "雪圃学校", x: 35.45, y: 74.04 },
        { id: "aoxin-ancestral-hall", name: "澳心何氏先祠", x: 51.66, y: 64.02 },
        { id: "artist-village", name: "画家艺术村", x: 56.89, y: 59.77 },
        { id: "shishijiao", name: "石狮脚", x: 55.71, y: 73.93, labelSide: "left" }
      ]
    },
    fullDay: {
      id: "fullDay",
      name: "一日游",
      duration: "约 6 小时",
      color: "#3f633c",
      stops: [
        { id: "village-history-hall", name: "黄连村史馆", x: 48.94, y: 81.05 },
        { id: "visitor-center", name: "游客服务中心", x: 38.26, y: 82.90 },
        { id: "chef-museum", name: "顺德厨师文化展示馆", x: 32.15, y: 92.51 },
        { id: "xuepu-school", name: "雪圃学校", x: 35.45, y: 74.04 },
        { id: "cangjie-temple", name: "仓沮圣庙", x: 36.86, y: 56.19 },
        { id: "shigui-park", name: "石龟祠公园", x: 25.15, y: 34.50 },
        { id: "gumiao-park", name: "古庙公园", x: 39.24, y: 15.94 },
        { id: "longshi", name: "黄连龙虱馆", x: 37.45, y: 11.01 },
        { id: "binshui-park", name: "滨水公园", x: 68.06, y: 7.86 },
        { id: "nan-general-temple", name: "南大将军古庙", x: 45.90, y: 52.41 },
        { id: "aoxin-ancestral-hall", name: "澳心何氏先祠", x: 51.66, y: 64.02 },
        { id: "artist-village", name: "画家艺术村", x: 56.89, y: 59.77 },
        { id: "shishijiao", name: "石狮脚", x: 55.71, y: 73.93, labelSide: "left" }
      ]
    }
  };
})();
