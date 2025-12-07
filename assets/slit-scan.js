// Slit-scan module: creates a right-to-left scanning trail effect on video
// Usage: SlitScan.attachAll('video', { scanWidth: 8, dx: 2 })

;(function () {
  'use strict';

  function SlitScan(video, opts) {
    opts = opts || {};
    this.video = video;
    this.scanWidth = opts.scanWidth || 8;
    this.dx = opts.dx || 2;
    this.scanning = false;
    this.currentX = 0;

    // Create a container wrapper if video doesn't have one already
    let container = video.parentElement;
    if (!container || container.className !== 'slit-scan-container') {
      container = document.createElement('div');
      container.className = 'slit-scan-container';
      video.parentNode.insertBefore(container, video);
      container.appendChild(video);
    }

    // Set up container styles to enable absolute positioning of overlay
    container.style.position = 'relative';
    container.style.display = 'inline-block';
    container.style.width = '100%';
    container.style.height = '100%';

    // Set video to relative positioning
    video.style.position = 'relative';
    video.style.display = 'block';
    video.style.width = '100%';
    video.style.height = '100%';

    // Create main buffer canvas for slit-scan accumulation
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'slit-scan-canvas';
    this.canvas.style.position = 'absolute';
    this.canvas.style.left = '0';
    this.canvas.style.top = '0';
    this.canvas.style.zIndex = '10';
    this.canvas.style.pointerEvents = 'none';
    this.ctx = this.canvas.getContext('2d', { alpha: true });

    container.appendChild(this.canvas);
    this.container = container;

    // Resize canvas to match video display size
    const resizeCanvas = () => {
      const rect = video.getBoundingClientRect();
      const w = Math.max(1, Math.round(rect.width || video.offsetWidth || 640));
      const h = Math.max(1, Math.round(rect.height || video.offsetHeight || 480));

      this.canvas.width = w;
      this.canvas.height = h;
      this.canvas.style.width = w + 'px';
      this.canvas.style.height = h + 'px';

      if (this.currentX === 0) {
        this.currentX = w - this.scanWidth;
      }
    };

    // Initialize on video load and resize
    if (video.readyState >= 1) {
      resizeCanvas();
    }
    video.addEventListener('loadedmetadata', resizeCanvas.bind(this));
    window.addEventListener('resize', resizeCanvas.bind(this));

    // Pointer events for user interaction
    video.addEventListener('pointerdown', () => {
      this.scanning = true;
    });
    document.addEventListener('pointerup', () => {
      this.scanning = false;
    });

    // Reset on video end/seek
    video.addEventListener('ended', () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.currentX = this.canvas.width - this.scanWidth;
    });
    video.addEventListener('seeked', () => {
      if (video.currentTime <= 0.05) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.currentX = this.canvas.width - this.scanWidth;
      }
    });

    // Start animation loop
    this.animate = this.animate.bind(this);
    this.animate();
  }

  SlitScan.prototype.animate = function () {
    const v = this.video;
    const w = this.canvas.width;
    const h = this.canvas.height;

    if (this.scanning && v.readyState >= 2 && w > 0 && h > 0) {
      // Copy a vertical slice from video to canvas
      const srcX = Math.floor((this.currentX / w) * (v.videoWidth || w));
      const sliceWidth = Math.max(1, Math.floor((this.scanWidth / w) * (v.videoWidth || w)));

      try {
        this.ctx.drawImage(
          v,
          srcX, 0, sliceWidth, v.videoHeight || h,
          this.currentX, 0, this.scanWidth, h
        );
      } catch (e) {
        // Ignore cross-origin or other drawImage errors
      }
    }

    // Move scan line position
    this.currentX -= this.dx;
    if (this.currentX < -this.scanWidth) {
      this.currentX = w;
    }

    requestAnimationFrame(this.animate);
  };

  // Static methods
  SlitScan.attachTo = function (video, opts) {
    if (!video._slitScan) {
      video._slitScan = new SlitScan(video, opts);
    }
    return video._slitScan;
  };

  SlitScan.attachAll = function (selector, opts) {
    selector = selector || 'video';
    const videos = document.querySelectorAll(selector);
    const instances = [];

    videos.forEach(function (v) {
      if (!v._slitScan) {
        v.muted = true;
        v.playsInline = true;
        instances.push(SlitScan.attachTo(v, opts));
      }
    });

    return instances;
  };

  window.SlitScan = SlitScan;
})();
