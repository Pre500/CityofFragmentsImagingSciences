// sketch.js — attach canvas to the full-screen #canvas-container so the orb appears across the whole page
let cnv;
let containerEl;
// approximate mouse "radius" (in px) — treated as the cursor size; main orb radius = 2 * mouseRadius
const mouseRadius = 6;

function setup() {
  // always use the full-screen canvas container so the orb appears over the entire viewport
  containerEl = document.getElementById('canvas-container') || document.getElementById('canvas-rect');
  // create a full-window canvas
  cnv = createCanvas(windowWidth, windowHeight);
  // attach inside the full-screen container
  if (containerEl && containerEl.id) cnv.parent(containerEl.id);
  // position and sizing so it fills the viewport
  cnv.style('position', 'fixed');
  cnv.style('left', '50%');
  cnv.style('top', '0px');
  cnv.style('transform', 'translateX(-50%)');
  cnv.style('pointer-events', 'none');
  noStroke();
  pixelDensity(1);
}

function draw() {
  clear(); // keep canvas transparent by default

  // bright orb with radiating pulse (visible across whole screen)
  push();
  // additive blending makes glow brighter where layers overlap
  blendMode(ADD);

  // base sizes
  const mainRadius = mouseRadius * 2; // radius (twice the mouse radius as requested)

  // animated pulse factor (0..1) for radiating ring
  const t = millis() / 1000; // seconds
  const pulse = (sin(t * 2.0) * 0.5) + 0.5; // smooth oscillation

  // main bright core
  noStroke();
  fill(255, 255, 255, 220); // bright core
  ellipse(mouseX, mouseY, mainRadius * 2, mainRadius * 2);

  // inner glow layers (stacked, lower alpha)
  fill(255, 255, 255, 120);
  ellipse(mouseX, mouseY, mainRadius * 4, mainRadius * 4);

  fill(255, 255, 255, 50);
  ellipse(mouseX, mouseY, mainRadius * 8, mainRadius * 8);

  // soft animated radiating ring (stroke only) — reduced size by ~50%
  const ringMax = mainRadius * 9; // half of previous value
  const ringRadius = (mainRadius * 4 + pulse * ringMax) * 0.5; // shrink by half
  const ringAlpha = lerp(200, 12, pulse); // visibility
  stroke(255, 255, 255, ringAlpha);
  strokeWeight(2 + pulse * 4);
  noFill();
  ellipse(mouseX, mouseY, ringRadius * 2, ringRadius * 2);

  // subtle trailing rings for extra radiance
  const ring2 = ringRadius * 0.6;
  stroke(255, 255, 255, 18);
  strokeWeight(1.5);
  ellipse(mouseX, mouseY, ring2 * 2, ring2 * 2);

  pop();
  blendMode(BLEND);
}

function windowResized() {
  // always resize to full window
  resizeCanvas(windowWidth, windowHeight);
}
