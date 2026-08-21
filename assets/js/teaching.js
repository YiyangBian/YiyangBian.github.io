(() => {
  const metrics = document.querySelector("[data-teaching-metrics]");
  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (metrics && !prefersReducedMotion && "IntersectionObserver" in window) {
    metrics.classList.add("is-animated");

    const metricsObserver = new IntersectionObserver(
      (entries, observer) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          metrics.classList.add("is-visible");
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    metricsObserver.observe(metrics);
  }

  const certificateViewer = document.querySelector("[data-certificate-viewer]");
  const certificateImage = certificateViewer?.querySelector("[data-certificate-image]");
  const certificateViewport = certificateViewer?.querySelector("[data-certificate-viewport]");
  const certificateCloseButton = certificateViewer?.querySelector("[data-certificate-close]");
  const certificateZoomOutButton = certificateViewer?.querySelector("[data-certificate-zoom-out]");
  const certificateResetButton = certificateViewer?.querySelector("[data-certificate-reset]");
  const certificateZoomInButton = certificateViewer?.querySelector("[data-certificate-zoom-in]");
  const certificateZoomValue = certificateViewer?.querySelector("[data-certificate-zoom-value]");
  const certificateLiveRegion = certificateViewer?.querySelector("[data-certificate-live]");
  const certificateOpenButtons = Array.from(document.querySelectorAll("[data-certificate-open]"));

  if (
    certificateViewer &&
    certificateImage &&
    certificateViewport &&
    certificateCloseButton &&
    certificateZoomOutButton &&
    certificateResetButton &&
    certificateZoomInButton &&
    certificateZoomValue &&
    certificateLiveRegion &&
    certificateOpenButtons.length > 0 &&
    typeof certificateViewer.showModal === "function"
  ) {
    const minimumZoom = 50;
    const maximumZoom = 250;
    const zoomStep = 25;
    let certificateZoom = 100;
    let certificateTrigger;

    const updateCertificateControls = () => {
      certificateZoomValue.textContent = `${certificateZoom}%`;
      certificateZoomOutButton.disabled = certificateZoom === minimumZoom;
      certificateZoomInButton.disabled = certificateZoom === maximumZoom;
    };

    const setCertificateZoom = (nextZoom, announce = true) => {
      const previousScrollWidth = certificateViewport.scrollWidth || 1;
      const previousScrollHeight = certificateViewport.scrollHeight || 1;
      const horizontalCenter = (certificateViewport.scrollLeft + certificateViewport.clientWidth / 2) / previousScrollWidth;
      const verticalCenter = (certificateViewport.scrollTop + certificateViewport.clientHeight / 2) / previousScrollHeight;
      const viewportStyles = window.getComputedStyle(certificateViewport);
      const horizontalPadding = Number.parseFloat(viewportStyles.paddingLeft) + Number.parseFloat(viewportStyles.paddingRight);
      const verticalPadding = Number.parseFloat(viewportStyles.paddingTop) + Number.parseFloat(viewportStyles.paddingBottom);
      const availableWidth = Math.max(1, certificateViewport.clientWidth - horizontalPadding);
      const availableHeight = Math.max(1, certificateViewport.clientHeight - verticalPadding);
      const imageAspectRatio = (certificateImage.naturalWidth || 1056) / (certificateImage.naturalHeight || 810);
      const fittedWidth = Math.min(availableWidth, availableHeight * imageAspectRatio);

      certificateZoom = Math.min(maximumZoom, Math.max(minimumZoom, nextZoom));
      certificateImage.style.width = `${fittedWidth * (certificateZoom / 100)}px`;
      updateCertificateControls();

      window.requestAnimationFrame(() => {
        certificateViewport.scrollLeft = horizontalCenter * certificateViewport.scrollWidth - certificateViewport.clientWidth / 2;
        certificateViewport.scrollTop = verticalCenter * certificateViewport.scrollHeight - certificateViewport.clientHeight / 2;
      });

      if (announce) {
        certificateLiveRegion.textContent = `Certificate zoom ${certificateZoom} percent`;
      }
    };

    certificateOpenButtons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        certificateTrigger = button;
        if (!certificateViewer.open) {
          certificateViewer.showModal();
          setCertificateZoom(100, false);
        }
      });
    });

    certificateCloseButton.addEventListener("click", () => certificateViewer.close());
    certificateZoomOutButton.addEventListener("click", () => setCertificateZoom(certificateZoom - zoomStep));
    certificateResetButton.addEventListener("click", () => setCertificateZoom(100));
    certificateZoomInButton.addEventListener("click", () => setCertificateZoom(certificateZoom + zoomStep));
    certificateImage.addEventListener("dblclick", () => setCertificateZoom(certificateZoom === 100 ? 175 : 100));

    certificateViewer.addEventListener("click", (event) => {
      if (event.target === certificateViewer) certificateViewer.close();
    });
    certificateViewer.addEventListener("keydown", (event) => {
      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        setCertificateZoom(certificateZoom + zoomStep);
      } else if (event.key === "-") {
        event.preventDefault();
        setCertificateZoom(certificateZoom - zoomStep);
      } else if (event.key === "0") {
        event.preventDefault();
        setCertificateZoom(100);
      }
    });
    certificateViewer.addEventListener("close", () => {
      if (!certificateViewer.open) {
        certificateZoom = 100;
        certificateImage.style.width = "100%";
        certificateLiveRegion.textContent = "";
        updateCertificateControls();
        certificateTrigger?.focus();
      }
    });
    window.addEventListener("resize", () => {
      if (certificateViewer.open) setCertificateZoom(certificateZoom, false);
    });
    certificateImage.addEventListener("load", () => {
      if (certificateViewer.open) setCertificateZoom(certificateZoom, false);
    });

    updateCertificateControls();
  }

  const feedback = document.querySelector("[data-teaching-feedback]");

  if (!feedback) return;

  const slides = Array.from(feedback.querySelectorAll("[data-feedback-slide]"));
  const controls = feedback.querySelector("[data-feedback-controls]");
  const dotsContainer = feedback.querySelector("[data-feedback-dots]");
  const previousButton = feedback.querySelector("[data-feedback-prev]");
  const nextButton = feedback.querySelector("[data-feedback-next]");
  const pauseButton = feedback.querySelector("[data-feedback-pause]");
  const pauseIcon = feedback.querySelector("[data-feedback-pause-icon]");
  const liveRegion = feedback.querySelector("[data-feedback-live]");

  if (slides.length < 2 || !controls || !dotsContainer || !previousButton || !nextButton || !pauseButton || !pauseIcon || !liveRegion) return;

  const autoplayDelay = 9000;
  let activeIndex = 0;
  let autoplayTimer;
  let isUserPaused = prefersReducedMotion;
  let isTemporarilyPaused = false;

  const dots = slides.map((_, index) => {
    const button = document.createElement("button");
    button.className = "teaching-feedback__dot";
    button.type = "button";
    button.setAttribute("aria-label", `Show student comment ${index + 1} of ${slides.length}`);
    button.addEventListener("click", () => showSlide(index, true));
    dotsContainer.append(button);
    return button;
  });

  const stopAutoplay = () => {
    window.clearInterval(autoplayTimer);
    autoplayTimer = undefined;
  };

  const startAutoplay = () => {
    stopAutoplay();
    if (!isUserPaused && !isTemporarilyPaused && !document.hidden) {
      autoplayTimer = window.setInterval(() => showSlide(activeIndex + 1, false), autoplayDelay);
    }
  };

  const updatePauseButton = () => {
    const isPaused = isUserPaused || isTemporarilyPaused;
    pauseButton.setAttribute("aria-label", isPaused ? "Play student comments" : "Pause student comments");
    pauseButton.setAttribute("aria-pressed", String(isUserPaused));
    pauseIcon.textContent = isPaused ? "▶" : "Ⅱ";
  };

  function showSlide(nextIndex, announce) {
    activeIndex = (nextIndex + slides.length) % slides.length;

    slides.forEach((slide, index) => {
      const isActive = index === activeIndex;
      slide.classList.toggle("is-active", isActive);
      slide.setAttribute("aria-hidden", String(!isActive));
    });

    dots.forEach((dot, index) => dot.setAttribute("aria-current", String(index === activeIndex)));

    if (announce) {
      liveRegion.textContent = `Student comment ${activeIndex + 1} of ${slides.length}`;
    }

    startAutoplay();
  }

  previousButton.addEventListener("click", () => showSlide(activeIndex - 1, true));
  nextButton.addEventListener("click", () => showSlide(activeIndex + 1, true));
  pauseButton.addEventListener("click", () => {
    isUserPaused = !isUserPaused;
    updatePauseButton();
    startAutoplay();
  });

  feedback.addEventListener("mouseenter", () => {
    isTemporarilyPaused = true;
    updatePauseButton();
    stopAutoplay();
  });
  feedback.addEventListener("mouseleave", () => {
    isTemporarilyPaused = false;
    updatePauseButton();
    startAutoplay();
  });
  feedback.addEventListener("focusin", () => {
    isTemporarilyPaused = true;
    updatePauseButton();
    stopAutoplay();
  });
  feedback.addEventListener("focusout", (event) => {
    if (!feedback.contains(event.relatedTarget)) {
      isTemporarilyPaused = false;
      updatePauseButton();
      startAutoplay();
    }
  });
  document.addEventListener("visibilitychange", startAutoplay);

  feedback.classList.add("is-enhanced");
  controls.hidden = false;
  showSlide(0, false);
  updatePauseButton();
})();
