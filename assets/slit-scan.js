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
    wrapper.style.display = 'inline-block';

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
      const w = video.videoWidth || video.clientWidth;
      const h = video.videoHeight || video.clientHeight;
      this.bufferCanvas.width = w;
      this.bufferCanvas.height = h;
      this.bufferCanvas.style.width = w + 'px';
      this.bufferCanvas.style.height = h + 'px';
      this.currentX = w - this.scanWidth;
    };

    if (video.readyState >= 1) initSize();
    video.addEventListener('loadedmetadata', initSize);

    wrapper.appendChild(this.bufferCanvas);

    // HUD line canvas (for visible scan line when scanning)
    this.hudCanvas = document.createElement('canvas');
    this.hudCanvas.width = this.bufferCanvas.width;
    this.hudCanvas.height = this.bufferCanvas.height;
    this.hudCanvas.style.position = 'absolute';
    this.hudCanvas.style.left = '0';
    this.hudCanvas.style.top = '0';
    this.hudCanvas.style.pointerEvents = 'none';
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

    // if video size changed, resize canvases
    if (v.videoWidth && (v.videoWidth !== w || v.videoHeight !== h)) {
      this.bufferCanvas.width = v.videoWidth;
      this.bufferCanvas.height = v.videoHeight;
      this.hudCanvas.width = v.videoWidth;
      this.hudCanvas.height = v.videoHeight;
      this.currentX = (v.videoWidth || this.bufferCanvas.width) - this.scanWidth;
    }

    // draw the current frame under/behind buffer (we don't draw video itself here)
    // When scanning, copy a vertical slice from the video into the buffer at currentX
    if (this.scanning && v.readyState >= 2) {
      // source x: wrap to video width if needed
      const srcX = (this.currentX + 0 + w) % w;
      try {
        // Efficient copy of a vertical strip from the video element
        this.ctx.drawImage(v, srcX, 0, this.scanWidth, h, srcX, 0, this.scanWidth, h);
      } catch (e) {
        // drawImage might throw if video not from same-origin or not ready; swallow
      }
    }

    // draw HUD (scan line)
    const hud = this.hudCtx;
    hud.clearRect(0, 0, this.hudCanvas.width, this.hudCanvas.height);
    if (this.scanning) {
      hud.strokeStyle = 'rgba(255,0,0,0.6)';
      hud.lineWidth = this.scanWidth;
      const linePos = this.currentX + Math.floor(this.scanWidth / 2);
      hud.beginPath();
      hud.moveTo(linePos + 0.5, 0);
      hud.lineTo(linePos + 0.5, this.hudCanvas.height);
      hud.stroke();
    }

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
