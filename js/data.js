(function () {
  "use strict";

  window.SPOT_DATA = [
    {
      id: "test-spot-01",
      name: "测试地标 A",
      category: "heritage",
      regionId: "test-region-core",
      x: 31.5,
      y: 45,
      longitude: null,
      latitude: null,
      navigationMode: "walk",
      description: "这是古村核心区域的测试热点，只用于验证地图定位与详情展示。正式景点名称和介绍需要等待团队资料。",
      images: ["assets/images/spot-01/01.svg"],
      audio: "assets/audio/test-audio.mp3",
      video: "assets/video/test-video.mp4",
      poster: "assets/images/spot-01/01.svg",
      isPlaceholder: true
    },
    {
      id: "test-spot-02",
      name: "测试地标 B",
      category: "architecture",
      regionId: "test-region-core",
      x: 48.5,
      y: 58,
      longitude: null,
      latitude: null,
      navigationMode: "walk",
      description: "这是第二个测试热点，用于确认热点在拖动和缩放后仍然对应手绘地图位置。",
      images: ["assets/images/spot-02/01.svg"],
      audio: "assets/audio/test-audio.mp3",
      video: "assets/video/test-video.mp4",
      poster: "assets/images/spot-02/01.svg",
      isPlaceholder: true
    },
    {
      id: "test-spot-03",
      name: "测试地标 C",
      category: "waterfront",
      regionId: "test-region-waterfront",
      x: 62.5,
      y: 77,
      longitude: null,
      latitude: null,
      navigationMode: "walk",
      description: "这是滨水区域的测试热点。当前名称、位置和媒体均不是正式黄连古村资料。",
      images: ["assets/images/spot-03/01.svg"],
      audio: "assets/audio/test-audio.mp3",
      video: "assets/video/test-video.mp4",
      poster: "assets/images/spot-03/01.svg",
      isPlaceholder: true
    }
  ];
})();
