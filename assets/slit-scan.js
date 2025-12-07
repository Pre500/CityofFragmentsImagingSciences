// Slit-scan module: creates scanning trail effects on video
// Supports 4 scan types: moving-vertical, moving-horizontal, fixed-vertical, fixed-horizontal
// Usage: SlitScan.attachAll('video', { scanWidth: 8, dx: 2, scanType: 'moving-vertical' })

;(function () {
  'use strict';

  function SlitScan(video, opts) {
    opts = opts || {};
    this.video = video;
    this.scanWidth = opts.scanWidth || 8;
    this.dx = opts.dx || 2;
    this.scanType = opts.scanType || 'moving-vertical'; // moving-vertical, moving-horizontal, fixed-vertical, fixed-horizontal
    this.scanning = false;
    this.currentX = 0;
    this.currentY = 0;

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
      if (this.currentY === 0) {
        this.currentY = h - this.scanWidth;
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
      this.container.classList.add('scanning');
    });
    document.addEventListener('pointerup', () => {
      this.scanning = false;
      this.container.classList.remove('scanning');
    });

    // Reset on video end/seek
    video.addEventListener('ended', () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.currentX = this.canvas.width - this.scanWidth;
      this.currentY = this.canvas.height - this.scanWidth;
    });
    video.addEventListener('seeked', () => {
      if (video.currentTime <= 0.05) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.currentX = this.canvas.width - this.scanWidth;
        this.currentY = this.canvas.height - this.scanWidth;
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
      if (this.scanType === 'moving-vertical') {
        this.drawVerticalScan(v, w, h);
      } else if (this.scanType === 'moving-horizontal') {
        this.drawHorizontalScan(v, w, h);
      } else if (this.scanType === 'fixed-vertical') {
        this.drawFixedVerticalScan(v, w, h);
      } else if (this.scanType === 'fixed-horizontal') {
        this.drawFixedHorizontalScan(v, w, h);
      }
    }

    // Draw visible scan line indicator (thin white line)
    this.drawScanLine(w, h);

    // Move scan line position based on scan type
    if (this.scanType.includes('vertical')) {
      this.currentX -= this.dx;
      if (this.currentX < -this.scanWidth) {
        this.currentX = w;
      }
    } else if (this.scanType.includes('horizontal')) {
      this.currentY -= this.dx;
      if (this.currentY < -this.scanWidth) {
        this.currentY = h;
      }
    }

    requestAnimationFrame(this.animate);
  };

  SlitScan.prototype.drawVerticalScan = function (v, w, h) {
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
  };

  SlitScan.prototype.drawHorizontalScan = function (v, w, h) {
    // Copy a horizontal slice from video to canvas
    const srcY = Math.floor((this.currentY / h) * (v.videoHeight || h));
    const sliceHeight = Math.max(1, Math.floor((this.scanWidth / h) * (v.videoHeight || h)));

    try {
      this.ctx.drawImage(
        v,
        0, srcY, v.videoWidth || w, sliceHeight,
        0, this.currentY, w, this.scanWidth
      );
    } catch (e) {
      // Ignore cross-origin or other drawImage errors
    }
  };

  SlitScan.prototype.drawFixedVerticalScan = function (v, w, h) {
    // Scan from center (fixed vertical)
    const fixedX = Math.floor(w / 2);
    const srcX = Math.floor((fixedX / w) * (v.videoWidth || w));
    const sliceWidth = Math.max(1, Math.floor((this.scanWidth / w) * (v.videoWidth || w)));

    try {
      this.ctx.drawImage(
        v,
        srcX, 0, sliceWidth, v.videoHeight || h,
        fixedX, 0, this.scanWidth, h
      );
    } catch (e) {
      // Ignore errors
    }
  };

  SlitScan.prototype.drawFixedHorizontalScan = function (v, w, h) {
    // Scan from center (fixed horizontal)
    const fixedY = Math.floor(h / 2);
    const srcY = Math.floor((fixedY / h) * (v.videoHeight || h));
    const sliceHeight = Math.max(1, Math.floor((this.scanWidth / h) * (v.videoHeight || h)));

    try {
      this.ctx.drawImage(
        v,
        0, srcY, v.videoWidth || w, sliceHeight,
        0, fixedY, w, this.scanWidth
      );
    } catch (e) {
      // Ignore errors
    }
  };

  SlitScan.prototype.drawScanLine = function (w, h) {
    // Draw visible scan line indicator (thin white line)
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    this.ctx.lineWidth = 1.5;
    this.ctx.beginPath();

    if (this.scanType.includes('vertical')) {
      // Vertical scan line
      this.ctx.moveTo(this.currentX, 0);
      this.ctx.lineTo(this.currentX, h);
    } else if (this.scanType.includes('horizontal')) {
      // Horizontal scan line
      this.ctx.moveTo(0, this.currentY);
      this.ctx.lineTo(w, this.currentY);
    }

    this.ctx.stroke();
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
