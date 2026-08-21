(function () {
  "use strict";

  function createSection(title, content, className) {
    var section = document.createElement("section");
    section.className = "media-section";
    var heading = document.createElement("h3");
    heading.textContent = title;
    section.appendChild(heading);
    if (className) content.className = className;
    section.appendChild(content);
    return section;
  }

  function init() {
    var modal = document.getElementById("spotModal");
    var content = document.getElementById("modalContent");
    var closeButton = document.getElementById("closeModal");
    var lastTrigger = null;

    function close() {
      if (modal.hidden) return;
      window.MediaController.stopAll(content, true);
      content.replaceChildren();
      modal.hidden = true;
      document.body.classList.remove("modal-open");
      if (lastTrigger) lastTrigger.focus({ preventScroll: true });
    }

    function open(spot, trigger) {
      window.MediaController.stopAll(content, true);
      content.replaceChildren();
      lastTrigger = trigger || document.activeElement;

      var body = document.createElement("article");
      body.className = "modal-body";
      var kicker = document.createElement("p");
      kicker.className = "modal-kicker";
      kicker.textContent = "童谣《" + spot.song + "》 · 地图编号 " + spot.mapNumber;
      var title = document.createElement("h2");
      title.id = "modalTitle";
      title.textContent = spot.title || spot.name;
      var description = document.createElement("p");
      description.className = "modal-description";
      description.textContent = spot.description;
      body.append(kicker, title, description);

      if (spot.images && spot.images.length) {
        var gallery = document.createElement("div");
        spot.images.forEach(function (src, index) {
          var image = document.createElement("img");
          image.src = src;
          image.alt = spot.name + "图片 " + (index + 1);
          image.loading = "lazy";
          gallery.appendChild(image);
        });
        body.appendChild(createSection("图片", gallery, "image-gallery"));
      }

      if (spot.video) {
        var video = document.createElement("video");
        video.controls = true;
        video.preload = "none";
        video.playsInline = true;
        video.setAttribute("webkit-playsinline", "true");
        video.poster = spot.poster || "";
        video.src = spot.video;
        body.appendChild(createSection("视频介绍", video));
      }

      if (spot.audio) {
        var audioWrap = document.createElement("div");
        var audio = document.createElement("audio");
        audio.controls = true;
        audio.preload = "none";
        audio.src = spot.audio;
        var note = document.createElement("p");
        note.className = "media-note";
        note.textContent = "音频不会自动播放；切换媒体时会自动暂停上一段。";
        audioWrap.append(audio, note);
        body.appendChild(createSection("音频介绍", audioWrap));
      }

      content.appendChild(body);
      window.MediaController.bind(content);
      modal.hidden = false;
      document.body.classList.add("modal-open");
      closeButton.focus({ preventScroll: true });
    }

    closeButton.addEventListener("click", close);
    modal.querySelectorAll("[data-close-modal]").forEach(function (element) { element.addEventListener("click", close); });
    document.addEventListener("keydown", function (event) { if (event.key === "Escape") close(); });

    window.SpotModal = { open: open, close: close };
  }

  window.ModalModule = { init: init };
})();
