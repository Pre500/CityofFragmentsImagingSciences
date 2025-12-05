// Minimal, reliable orb that follows the pointer without clicks
// Port of the Processing scanline effect to p5.js.
// Uses an offscreen graphics buffer at 720x540 to sample frames from a video
// and copies vertical strips into a persistent `buffer` image while scanning.

let cnv;
let containerEl;
let cursorX = 0;
let cursorY = 0;
const mouseRadius = 6;

// single window listeners update globals (no duplication; they run even before setup)
if (typeof window !== 'undefined') {
  window.__cf_cursorX = window.__cf_cursorX || 0;
  window.__cf_cursorY = window.__cf_cursorY || 0;
  window.addEventListener('mousemove', (e) => {
    window.__cf_cursorX = e.clientX;
    window.__cf_cursorY = e.clientY;
  }, { passive: true });
  window.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      window.__cf_cursorX = e.touches[0].clientX;
      window.__cf_cursorY = e.touches[0].clientY;
    }
  }, { passive: true });
}


function setup() {
  containerEl = document.getElementById('canvas-container') || document.body;
  cnv = createCanvas(windowWidth, windowHeight);
  if (containerEl && containerEl.id) cnv.parent(containerEl.id);

  // position canvas to cover viewport and be click-through
  // make canvas overlay; keep pointer-events none so UI remains clickable
  cnv.position(0, 0);
  cnv.style('position', 'fixed');
  cnv.style('left', '0px');
  cnv.style('top', '0px');
  cnv.style('pointer-events', 'none');
  cnv.style('z-index', '3');

  noStroke();
  pixelDensity(1);

  // seed cursor in center
  cursorX = width / 2;
  cursorY = height / 2;
}

function draw() {
  clear();
  push();
  blendMode(ADD);

  const mainRadius = mouseRadius * 2;
  const t = millis() / 1000;
  const pulse = (sin(t * 2.0) * 0.5) + 0.5;

  // use direct globals (no lerp) so orb snaps to pointer immediately
  const px = (typeof window.__cf_cursorX === 'number') ? window.__cf_cursorX : cursorX;
  const py = (typeof window.__cf_cursorY === 'number') ? window.__cf_cursorY : cursorY;

  // draw core and glows
  noStroke();
  fill(255, 255, 255, 230);
  ellipse(px, py, mainRadius * 2, mainRadius * 2);

  fill(255, 255, 255, 120);
  ellipse(px, py, mainRadius * 4, mainRadius * 4);

  fill(255, 255, 255, 50);
  ellipse(px, py, mainRadius * 8, mainRadius * 8);

  // radiating ring
  const ringMax = mainRadius * 9;
  const ringRadius = (mainRadius * 4 + pulse * ringMax) * 0.5;
  const ringAlpha = lerp(200, 12, pulse);
  stroke(255, 255, 255, ringAlpha);
  strokeWeight(2 + pulse * 4);
  noFill();
  ellipse(px, py, ringRadius * 2, ringRadius * 2);

  // outer subtle ring
  const ring2 = ringRadius * 0.6;
  stroke(255, 255, 255, 18);
  strokeWeight(1.5);
  ellipse(px, py, ring2 * 2, ring2 * 2);
  
  pop();
  blendMode(BLEND);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}