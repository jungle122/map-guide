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
      var title = document.createElement("h2");
      title.id = "modalTitle";
      title.textContent = spot.title || spot.name;
      var description = document.createElement("p");
      description.className = "modal-description";
      description.textContent = spot.description;
      body.appendChild(title);

      function appendBaikeButton(label, url, isImage) {
        var baikeButton = document.createElement("a");
        baikeButton.className = "baike-button" + (isImage ? " is-image" : "");
        baikeButton.href = url;
        baikeButton.target = "_blank";
        baikeButton.rel = "noopener noreferrer";
        baikeButton.textContent = label;
        body.appendChild(baikeButton);
      }

      if (spot.baikeLinks && spot.baikeLinks.length) {
        var baikeWrap = document.createElement("div");
        baikeWrap.className = "baike-buttons";
        spot.baikeLinks.forEach(function (link) {
          var baikeButton = document.createElement("a");
          baikeButton.className = "baike-button";
          baikeButton.href = link.url;
          baikeButton.target = "_blank";
          baikeButton.rel = "noopener noreferrer";
          baikeButton.textContent = link.name;
          baikeWrap.appendChild(baikeButton);
        });
        body.appendChild(baikeWrap);
      } else if (spot.baikeUrl) {
        appendBaikeButton(spot.name, spot.baikeUrl, !!spot.baikeIsImage);
      }

      body.appendChild(description);

      if (spot.additionalInfo) {
        var additionalInfo = document.createElement("p");
        additionalInfo.textContent = spot.additionalInfo;
        body.appendChild(createSection("古迹介绍", additionalInfo, "modal-description"));
      }

      if (spot.images && spot.images.length) {
        var gallery = document.createElement("div");
        spot.images.forEach(function (src, index) {
          var imageLink = document.createElement("a");
          imageLink.className = "image-gallery-link";
          imageLink.href = src;
          imageLink.target = "_blank";
          imageLink.rel = "noopener noreferrer";
          imageLink.setAttribute("aria-label", "查看" + spot.name + "图片 " + (index + 1));
          var image = document.createElement("img");
          image.src = src;
          image.alt = spot.name + "图片 " + (index + 1);
          image.loading = "lazy";
          imageLink.appendChild(image);
          gallery.appendChild(imageLink);
        });
        body.appendChild(createSection("图片", gallery, "image-gallery"));
      }

      if (spot.video) {
        var video = document.createElement("video");
        video.controls = true;
        video.preload = "metadata";
        video.playsInline = true;
        video.setAttribute("webkit-playsinline", "true");
        video.src = spot.video + "#t=0.1";
        body.appendChild(createSection("童谣视频", video));
      }

      if (spot.audio) {
        var audioWrap = document.createElement("div");
        var audio = document.createElement("audio");
        audio.controls = true;
        audio.preload = "none";
        audio.src = spot.audio;
        audioWrap.appendChild(audio);
        body.appendChild(createSection("童谣音频", audioWrap));
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
