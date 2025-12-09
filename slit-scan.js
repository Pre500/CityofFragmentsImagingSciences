// Slit-scan module: creates scanning trail effects on video
// Supports 6 scan types: moving vertical (RTL/LTR), moving horizontal (down/up), fixed vertical/horizontal

;(function () {
  'use strict';

  function SlitScan(video, opts) {
    if (!video) {
      console.error('SlitScan: video element required');
      return;
    }

    opts = opts || {};
    this.video = video;
    this.scanWidth = opts.scanWidth || 8;
    this.dx = opts.dx || 2;
    this.scanType = opts.scanType || 'fixed-vertical';
    this.scanning = true; // Always active for mouse movement
    this.currentX = 0;
    this.currentY = 0;
    this.mouseActive = false; // Track if mouse is over video
    
    // Time-based capture system for fixed scans
    this.capturedSlices = [];
    this.lastCaptureTime = 0;
    this.captureInterval = 16; // ms between captures (faster fill)

    // Set up container as parent element
    let container = video.parentElement;
    if (!container?.classList?.contains('slit-scan-container')) {
      container = document.createElement('div');
      container.className = 'slit-scan-container';
      video.parentNode.insertBefore(container, video);
      container.appendChild(video);
    }

    container.style.position = 'relative';
    container.style.display = 'block';
    container.style.width = '100%';
    container.style.height = '100%';
    container.style.overflow = 'visible';

    video.style.position = 'relative';
    video.style.display = 'block';
    video.style.width = '100%';
    video.style.height = '100%';
    video.style.zIndex = '1';

    // Create main buffer canvas for slit-scan accumulation
    this.canvas = document.createElement('canvas');
    this.canvas.className = 'slit-scan-canvas';
    this.canvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:10;pointer-events:none;display:block;';
    this.ctx = this.canvas.getContext('2d', { alpha: true, willReadFrequently: true });

    // Create separate canvas for scan line indicator
    this.lineCanvas = document.createElement('canvas');
    this.lineCanvas.className = 'slit-scan-line';
    this.lineCanvas.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;z-index:11;pointer-events:none;display:block;';
    this.lineCtx = this.lineCanvas.getContext('2d', { alpha: true });
    
    // Verify contexts were created
    if (!this.ctx || !this.lineCtx) {
      console.error('SlitScan: Failed to create canvas contexts');
      return;
    }

    container.appendChild(this.canvas);
    container.appendChild(this.lineCanvas);
    this.container = container;
    
    console.log('SlitScan: Canvases created and appended', {
      canvas: this.canvas,
      lineCanvas: this.lineCanvas,
      container: container
    });

    // Progress bar UI
    this.progressBar = document.createElement('div');
    this.progressBar.className = 'slit-scan-progress-bar';
    this.progressBar.style.cssText = 'position:absolute;bottom:0;left:0;width:0%;height:3px;background-color:#ffffff;z-index:12;transition:width 0.1s linear';
    
    container.appendChild(this.progressBar);
    
    // Track loop completion
    this.lastProgress = 0;
    this.loopCount = 0;

    // Resize canvas to match video display size
    const resizeCanvas = () => {
      const rect = video.getBoundingClientRect();
      let w = Math.max(1, Math.round(rect.width || video.offsetWidth || 0));
      let h = Math.max(1, Math.round(rect.height || video.offsetHeight || 0));
      
      if (w === 0 || h === 0) {
        w = window.innerWidth || 640;
        h = window.innerHeight || 480;
      }

      // Resize canvases
      this.canvas.width = w;
      this.canvas.height = h;
      this.lineCanvas.width = w;
      this.lineCanvas.height = h;
      
      console.log('SlitScan: Canvas resized to', w, 'x', h);

      // Initialize scan position based on type
      if (this.currentX === 0) {
        this.currentX = this.scanType === 'moving-vertical' ? w : 
                        this.scanType === 'moving-vertical-ltr' ? -this.scanWidth :
                        w / 2;
      }
      if (this.currentY === 0) {
        this.currentY = this.scanType === 'moving-horizontal' ? -this.scanWidth :
                        this.scanType === 'moving-horizontal-utd' ? h :
                        h / 2;
      }
    };

    // Initialize on video load and resize
    if (video.readyState >= 1) {
      resizeCanvas();
    }
    video.addEventListener('loadedmetadata', resizeCanvas.bind(this));
    window.addEventListener('resize', resizeCanvas.bind(this));

    // Mouse movement tracking for scan position
    const updateScanPosition = (e) => {
      const rect = this.container.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      
      this.mouseActive = true;
      
      // Update position based on scan type
      if (this.scanType.includes('vertical')) {
        this.currentX = Math.max(0, Math.min(mouseX, this.canvas.width - this.scanWidth));
      } else if (this.scanType.includes('horizontal')) {
        this.currentY = Math.max(0, Math.min(mouseY, this.canvas.height - this.scanWidth));
      }
    };
    
    const mouseEnter = () => {
      this.mouseActive = true;
      this.container.classList.add('scanning');
      // Clear canvas when starting new scan
      this.capturedSlices = [];
      if (this.ctx && this.canvas.width > 0) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
      console.log('Mouse entered - slit-scan active', this.scanType);
    };
    
    const mouseLeave = () => {
      this.mouseActive = false;
      this.container.classList.remove('scanning');
      console.log('Mouse left - slit-scan inactive');
      // Clear captured slices when mouse leaves
      this.capturedSlices = [];
      // Clear the canvas
      if (this.ctx && this.canvas.width > 0) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      }
    };
    
    // Track mouse movement over the container - no click required
    container.addEventListener('pointermove', updateScanPosition);
    container.addEventListener('mouseenter', mouseEnter);
    container.addEventListener('mouseleave', mouseLeave);
    video.addEventListener('pointermove', updateScanPosition);

    // Video event handlers
    video.addEventListener('ended', () => {
      this.currentX = this.canvas.width - this.scanWidth;
      this.currentY = this.canvas.height - this.scanWidth;
    });
    
    video.addEventListener('seeked', () => {
      if (video.currentTime <= 0.05) {
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
    
    // Safety check for contexts
    if (!this.ctx || !this.lineCtx) {
      requestAnimationFrame(this.animate);
      return;
    }
    
    // Update progress bar if available
    if (v.duration && v.duration > 0) {
      const progress = (v.currentTime / v.duration) * 100;
      this.progressBar.style.width = progress + '%';
      this.lastProgress = progress;
    }

    // Only clear canvas when mouse leaves (let slices accumulate)
    
    // Only process if video is ready and canvas is sized and mouse is active
    if (v.readyState >= 2 && w > 0 && h > 0 && this.mouseActive) {
      // Capture slices for fixed scans
      if (this.scanType === 'fixed-vertical' || this.scanType === 'fixed-horizontal') {
        const now = Date.now();
        if (now - this.lastCaptureTime > this.captureInterval) {
          this.captureSlice(v, w, h);
          this.lastCaptureTime = now;
        }
      }
      
      // Draw based on scan type
      if (this.scanType === 'moving-vertical' || this.scanType === 'moving-vertical-ltr') {
        this.drawMovingVerticalScan(v, w, h);
      } else if (this.scanType === 'moving-horizontal' || this.scanType === 'moving-horizontal-utd') {
        this.drawMovingHorizontalScan(v, w, h);
      } else if (this.scanType === 'fixed-vertical') {
        this.drawFixedVerticalScan(v, w, h);
      } else if (this.scanType === 'fixed-horizontal') {
        this.drawFixedHorizontalScan(v, w, h);
      }
    }
    
    // Show scan line only when mouse is active
    this.lineCtx.clearRect(0, 0, w, h);
    if (w > 0 && h > 0 && this.mouseActive) {
      this.drawScanLine(w, h);
    }

    // Update position based on scan type (only for moving scans, not fixed)
    if (this.scanType === 'moving-vertical') {
      this.currentX -= this.dx;
      if (this.currentX < -this.scanWidth) this.currentX = w;
    } else if (this.scanType === 'moving-vertical-ltr') {
      this.currentX += this.dx;
      if (this.currentX > w) this.currentX = -this.scanWidth;
    } else if (this.scanType === 'moving-horizontal') {
      this.currentY += this.dx;
      if (this.currentY > h) this.currentY = -this.scanWidth;
    } else if (this.scanType === 'moving-horizontal-utd') {
      this.currentY -= this.dx;
      if (this.currentY < -this.scanWidth) this.currentY = h;
    }
    // Fixed scans now use mouse position (set in pointermove handler)

    requestAnimationFrame(this.animate);
  };

  // Capture video slice at current moment
  SlitScan.prototype.captureSlice = function (v, w, h) {
    if (this.scanType === 'fixed-vertical') {
      const centerX = Math.floor(this.currentX);
      const srcX = Math.floor((centerX / w) * (v.videoWidth || w));
      const sliceWidth = Math.max(1, Math.floor((this.scanWidth / w) * (v.videoWidth || w)));
      
      try {
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = this.scanWidth;
        sliceCanvas.height = h;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(v, srcX, 0, sliceWidth, v.videoHeight || h, 0, 0, this.scanWidth, h);
        
        this.capturedSlices.push({
          canvas: sliceCanvas,
          x: this.currentX,
          width: this.scanWidth,
          height: h
        });
      } catch (e) {
        // Ignore cross-origin errors
      }
    } else if (this.scanType === 'fixed-horizontal') {
      const centerY = Math.floor(this.currentY);
      const srcY = Math.floor((centerY / h) * (v.videoHeight || h));
      const sliceHeight = Math.max(1, Math.floor((this.scanWidth / h) * (v.videoHeight || h)));
      
      try {
        const sliceCanvas = document.createElement('canvas');
        sliceCanvas.width = w;
        sliceCanvas.height = this.scanWidth;
        const ctx = sliceCanvas.getContext('2d');
        ctx.drawImage(v, 0, srcY, v.videoWidth || w, sliceHeight, 0, 0, w, this.scanWidth);
        
        this.capturedSlices.push({
          canvas: sliceCanvas,
          y: this.currentY,
          width: w,
          height: this.scanWidth
        });
      } catch (e) {
        // Ignore cross-origin errors
      }
    }
  };

  // Moving vertical scan
  SlitScan.prototype.drawMovingVerticalScan = function (v, w, h) {
    const srcX = Math.floor((this.currentX / w) * (v.videoWidth || w));
    const sliceWidth = Math.max(1, Math.floor((this.scanWidth / w) * (v.videoWidth || w)));
    try {
      this.ctx.drawImage(v, srcX, 0, sliceWidth, v.videoHeight || h, this.currentX, 0, this.scanWidth, h);
    } catch (e) {}
  };

  // Moving horizontal scan
  SlitScan.prototype.drawMovingHorizontalScan = function (v, w, h) {
    const srcY = Math.floor((this.currentY / h) * (v.videoHeight || h));
    const sliceHeight = Math.max(1, Math.floor((this.scanWidth / h) * (v.videoHeight || h)));
    try {
      this.ctx.drawImage(v, 0, srcY, v.videoWidth || w, sliceHeight, 0, this.currentY, w, this.scanWidth);
    } catch (e) {}
  };

  // Fixed vertical scan: draw captured slices
  SlitScan.prototype.drawFixedVerticalScan = function (v, w, h) {
    try {
      // Keep only last 50 slices for performance
      if (this.capturedSlices.length > 50) {
        this.capturedSlices.shift();
      }
      
      // Draw captured slices trailing from the current mouse position
      for (let i = 0; i < this.capturedSlices.length; i++) {
        const slice = this.capturedSlices[i];
        const offset = (this.capturedSlices.length - 1 - i) * this.dx;
        const drawX = this.currentX - offset;
        if (drawX + this.scanWidth > 0 && drawX < w) {
          this.ctx.drawImage(slice.canvas, drawX, 0);
        }
      }
    } catch (e) {
      console.error('Draw error:', e);
    }
  };

  // Fixed horizontal scan: draw captured slices
  SlitScan.prototype.drawFixedHorizontalScan = function (v, w, h) {
    try {
      // Keep only last 50 slices for performance
      if (this.capturedSlices.length > 50) {
        this.capturedSlices.shift();
      }
      
      // Draw captured slices trailing from the current mouse position
      for (let i = 0; i < this.capturedSlices.length; i++) {
        const slice = this.capturedSlices[i];
        const offset = (this.capturedSlices.length - 1 - i) * this.dx;
        const drawY = this.currentY - offset;
        if (drawY + this.scanWidth > 0 && drawY < h) {
          this.ctx.drawImage(slice.canvas, 0, drawY);
        }
      }
    } catch (e) {
      console.error('Draw error:', e);
    }
  };

  // Draw scan line indicator
  SlitScan.prototype.drawScanLine = function (w, h) {
    this.lineCtx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    this.lineCtx.lineWidth = 1.5;
    this.lineCtx.beginPath();

    if (this.scanType.includes('vertical')) {
      const lineX = this.scanType.includes('fixed') ? w / 2 : this.currentX;
      this.lineCtx.moveTo(lineX, 0);
      this.lineCtx.lineTo(lineX, h);
    } else if (this.scanType.includes('horizontal')) {
      const lineY = this.scanType.includes('fixed') ? h / 2 : this.currentY;
      this.lineCtx.moveTo(0, lineY);
      this.lineCtx.lineTo(w, lineY);
    }

    this.lineCtx.stroke();
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

  // Export to window
  if (typeof window !== 'undefined') {
    window.SlitScan = SlitScan;
  }
})();
