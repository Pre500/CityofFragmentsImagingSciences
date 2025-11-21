// Port of the Processing scanline effect to p5.js.
// Uses an offscreen graphics buffer at 720x540 to sample frames from a video
// and copies vertical strips into a persistent `buffer` image while scanning.

let cnv;
let containerEl;

// video and buffers
let vid;            // p5.MediaElement for the video
let pg;             // offscreen graphics to render video at 720x540
let bufferImg;      // persistent image where scanned strips accumulate

// scan parameters (kept from Processing code)
let currentX = 720 - 8;
let dx = 2;
let scanWidth = 8;
let scanning = false;

// lastTime to detect loop reset
let lastVideoTime = 0;

function setup() {
  containerEl = document.getElementById('canvas-container') || document.body;
  cnv = createCanvas(windowWidth, windowHeight);
  if (containerEl && containerEl.id) cnv.parent(containerEl.id);

  // make canvas overlay; keep pointer-events none so UI remains clickable
  cnv.position(0, 0);
  cnv.style('position', 'fixed');
  cnv.style('left', '0px');
  cnv.style('top', '0px');
  cnv.style('pointer-events', 'none');
  cnv.style('z-index', '3');

  pixelDensity(1);

  // offscreen graphics sized to Processing sketch dimensions
  pg = createGraphics(720, 540);
  pg.pixelDensity(1);

  // persistent buffer image (starts fully transparent)
  bufferImg = createImage(720, 540);
  bufferImg.loadPixels();
  for (let i = 0; i < bufferImg.pixels.length; i++) bufferImg.pixels[i] = color(0, 0, 0, 0);
  bufferImg.updatePixels();

  // load and start the video (matches Processing source)
  vid = createVideo(['assets/IMG_8770.MP4'], () => {
    vid.volume(0);
    vid.loop();
    vid.hide();
  });

  // window-level pointer listeners (canvas is click-through)
  if (typeof window !== 'undefined') {
    window.addEventListener('mousedown', () => { scanning = true; }, { passive: true });
    window.addEventListener('mouseup', () => { scanning = false; }, { passive: true });
    window.addEventListener('touchstart', () => { scanning = true; }, { passive: true });
    window.addEventListener('touchend', () => { scanning = false; }, { passive: true });
  }
}

function draw() {
  clear();
  background(0);

  // draw the current video frame into offscreen graphics at 720x540
  try {
    pg.image(vid, 0, 0, 720, 540);
  } catch (e) {
    // video may not be ready yet
  }

  // detect loop / reset: when video time jumps back near 0
  let curTime = 0;
  if (vid && vid.elt && typeof vid.elt.currentTime === 'number') curTime = vid.elt.currentTime;
  if (curTime <= 0.05 && lastVideoTime > 0.2) {
    // reset the persistent buffer
    bufferImg = createImage(720, 540);
    bufferImg.loadPixels();
    for (let i = 0; i < bufferImg.pixels.length; i++) bufferImg.pixels[i] = color(0, 0, 0, 0);
    bufferImg.updatePixels();
    currentX = 720 - scanWidth;
  }
  lastVideoTime = curTime;

  // If scanning, copy vertical strip columns from pg into bufferImg
  if (scanning) {
    pg.loadPixels();
    bufferImg.loadPixels();
    for (let sx = 0; sx < scanWidth; sx++) {
      let x = (currentX + sx) % 720;
      if (x < 0) x += 720;
      for (let y = 0; y < 540; y++) {
        let idx = (y * 720 + x) * 4; // index into pixel array
        // copy RGBA components
        bufferImg.pixels[idx + 0] = pg.pixels[idx + 0];
        bufferImg.pixels[idx + 1] = pg.pixels[idx + 1];
        bufferImg.pixels[idx + 2] = pg.pixels[idx + 2];
        bufferImg.pixels[idx + 3] = 255;
      }
    }
    bufferImg.updatePixels();
  }

  // draw the live video (scaled to canvas)
  image(pg, 0, 0, width, height);

  // draw the accumulated buffer on top (scaled)
  image(bufferImg, 0, 0, width, height);

  // draw thick vertical scan line (red) — scale position to canvas width
  noFill();
  stroke(255, 0, 0, 180);
  strokeWeight(scanWidth * (width / 720));
  let linePos = (currentX + scanWidth / 2) * (width / 720);
  line(linePos, 0, linePos, height);

  // Move scan line from right to left
  currentX -= dx;
  if (currentX < 0) currentX = 720 - scanWidth; // Loop back to right edge
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
