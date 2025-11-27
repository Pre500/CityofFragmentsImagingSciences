// Slit-scan module (right-to-left default)
// Usage: include this file and call SlitScan.attachAll() after DOM load.

;(function () {
  'use strict';

  function createCanvasOverlay(video) {
    const canvas = document.createElement('canvas');
    canvas.style.position = 'absolute';
    canvas.style.left = '0';
    canvas.style.top = '0';
    canvas.style.pointerEvents = 'none';
    canvas.width = video.videoWidth || video.clientWidth;
    canvas.height = video.videoHeight || video.clientHeight;
    return canvas;
  }

  function SlitScan(video, opts) {
    this.video = video;
    this.scanWidth = opts.scanWidth || 8;
    this.dx = opts.dx || 2; // pixels per frame
    this.scanning = false;
    this.currentX = (video.videoWidth || video.clientWidth) - this.scanWidth;

    // create wrapper to position overlay correctly
    const wrapper = document.createElement('div');
    wrapper.style.position = 'relative';
    wrapper.style.display = 'block';

    // wrap video
    video.parentNode.insertBefore(wrapper, video);
    wrapper.appendChild(video);

    this.bufferCanvas = document.createElement('canvas');
    this.bufferCanvas.style.position = 'absolute';
    this.bufferCanvas.style.left = '0';
    this.bufferCanvas.style.top = '0';
    this.bufferCanvas.style.pointerEvents = 'none';

    this.overlayCanvas = this.bufferCanvas; // same canvas used for drawing
    this.ctx = this.bufferCanvas.getContext('2d');

    // initialize sizes (if video metadata not loaded yet, wait)
    const initSize = () => {
      // Use the displayed size (bounding rect) so the overlay always covers the visible video
      const rect = video.getBoundingClientRect();
      // Fallback to client sizes if rect is zero
      const w = Math.max(1, Math.round(rect.width || video.clientWidth || 1));
      const h = Math.max(1, Math.round(rect.height || video.clientHeight || 1));

      // update canvas display size (CSS) and drawing buffer size (pixel dimensions)
      wrapper.style.width = w + 'px';
      wrapper.style.height = h + 'px';
      this.bufferCanvas.width = w;
      this.bufferCanvas.height = h;
      this.bufferCanvas.style.width = w + 'px';
      this.bufferCanvas.style.height = h + 'px';

      // HUD canvas same size
      this.hudCanvas.width = w;
      this.hudCanvas.height = h;
      this.hudCanvas.style.width = w + 'px';
      this.hudCanvas.style.height = h + 'px';

      // compute mapping from display (canvas) pixels to video intrinsic pixels
      const vidW = video.videoWidth || video.naturalWidth || (w);
      const vidH = video.videoHeight || video.naturalHeight || (h);
      this.scaleX = vidW / w;
      this.scaleY = vidH / h;

      // position the scan line at the right edge of the displayed canvas
      this.currentX = w - this.scanWidth;
    };

    // initialize size once metadata or layout is ready
    if (video.readyState >= 1) initSize();
    video.addEventListener('loadedmetadata', initSize);
    // observe layout changes to keep canvases matched to displayed video
    if (window.ResizeObserver) {
      this._ro = new ResizeObserver(initSize);
      this._ro.observe(video);
      this._ro.observe(wrapper);
    } else {
      window.addEventListener('resize', initSize);
    }

    wrapper.appendChild(this.bufferCanvas);

    // HUD line canvas (for visible scan line when scanning)
    this.hudCanvas = document.createElement('canvas');
    this.hudCanvas.width = this.bufferCanvas.width;
    this.hudCanvas.height = this.bufferCanvas.height;
    this.hudCanvas.style.position = 'absolute';
    this.hudCanvas.style.left = '0';
    this.hudCanvas.style.top = '0';
    this.hudCanvas.style.pointerEvents = 'none';
    this.hudCanvas.style.zIndex = '6';
    wrapper.appendChild(this.hudCanvas);
    this.hudCtx = this.hudCanvas.getContext('2d');

    // events
    video.addEventListener('pointerdown', (e) => {
      this.scanning = true; // user pressed on video
    });
    document.addEventListener('pointerup', (e) => {
      this.scanning = false;
    });

    // reset when video loops
    video.addEventListener('ended', () => this.resetBuffer());
    video.addEventListener('seeked', () => {
      if (video.currentTime <= 0.05) this.resetBuffer();
    });

    // main loop
    this._boundFrame = this.frame.bind(this);
    requestAnimationFrame(this._boundFrame);
  }

  SlitScan.prototype.resetBuffer = function () {
    const w = this.bufferCanvas.width;
    const h = this.bufferCanvas.height;
    this.ctx.clearRect(0, 0, w, h);
    this.currentX = w - this.scanWidth;
  };

  SlitScan.prototype.frame = function () {
    const v = this.video;
    const w = this.bufferCanvas.width;
    const h = this.bufferCanvas.height;

    // if intrinsic video size changed, recompute scale factors
    if (v.videoWidth && (!this.scaleX || v.videoWidth !== (this.scaleX * w))) {
      this.scaleX = (v.videoWidth || v.naturalWidth) / (w || 1);
      this.scaleY = (v.videoHeight || v.naturalHeight) / (h || 1);
    }

    // When scanning, copy a vertical slice from the video into the buffer at currentX
    if (this.scanning && v.readyState >= 2) {
      // displayX is the horizontal position in canvas/display pixels (wrapped)
      const displayX = ((this.currentX % w) + w) % w;
      // map to source (intrinsic video) x using scaleX
      const srcXVideo = Math.floor(displayX * (this.scaleX || 1));
      const srcWVideo = Math.max(1, Math.round(this.scanWidth * (this.scaleX || 1)));
      const destX = Math.floor(displayX);

      try {
        // draw the vertical slice from the video intrinsic pixels into the buffer canvas
        this.ctx.drawImage(
          v,
          srcXVideo, 0, srcWVideo, v.videoHeight || (h * (this.scaleY || 1)),
          destX, 0, this.scanWidth, h
        );
      } catch (e) {
        // drawImage might throw for cross-origin sources or if video not ready; ignore
      }
    }

    // draw HUD (scan line)
    const hud = this.hudCtx;
    const alpha = this.scanning ? 0.8 : 0.1;
    hud.strokeStyle = ;
    hud.lineWidth = this.scanWidth;
    const linePos = this.currentX + Math.floor(this.scanWidth / 2);
    hud.beginPath();
    hud.moveTo(linePos + 0.5, 0);
    hud.lineTo(linePos + 0.5, this.hudCanvas.height);
    hud.stroke();

    // advance scanline regardless of scanning state so the HUD moves
    this.currentX -= this.dx;
    if (this.currentX < 0) this.currentX = (this.bufferCanvas.width || w) - this.scanWidth;

    requestAnimationFrame(this._boundFrame);
  };

  // Attach to a video element
  SlitScan.attachTo = function (video, opts) {
    return new SlitScan(video, opts || {});
  };

  SlitScan.attachAll = function (selector, opts) {
    selector = selector || 'video';
    const videos = document.querySelectorAll(selector);
    const instances = [];
    videos.forEach((v) => {
      // autoplay and muted are useful for smooth play on many browsers
      v.muted = true;
      v.playsInline = true;
      if (v.paused) {
        // try to play, ignore failures
        v.play().catch(() => {});
      }
      instances.push(SlitScan.attachTo(v, opts || {}));
    });
    return instances;
  };

  // expose
  window.SlitScan = SlitScan;

})();
