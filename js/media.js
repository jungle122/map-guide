(function () {
  "use strict";

  var activeMedia = null;

  function stop(media, clearSource) {
    if (!media) return;
    media.pause();
    try { media.currentTime = 0; } catch (error) { /* Metadata may not be loaded. */ }
    if (clearSource) {
      media.removeAttribute("src");
      media.querySelectorAll("source").forEach(function (source) { source.removeAttribute("src"); });
      media.load();
    }
  }

  function stopAll(root, clearSource) {
    var scope = root || document;
    scope.querySelectorAll("audio, video").forEach(function (media) { stop(media, clearSource); });
    activeMedia = null;
  }

  function bind(root) {
    root.querySelectorAll("audio, video").forEach(function (media) {
      media.addEventListener("play", function () {
        if (activeMedia && activeMedia !== media) stop(activeMedia, false);
        activeMedia = media;
      });
      media.addEventListener("ended", function () {
        if (activeMedia === media) activeMedia = null;
      });
    });
  }

  window.MediaController = { bind: bind, stopAll: stopAll };
})();

