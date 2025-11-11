let img;
let slitWidth = 3; // width of each vertical slice

function preload() {
  // Load your skyline image (place it in the same folder)
  img = loadImage('city.jpg'); // you can rename your image file
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  noCursor();
}

function draw() {
  background(0);
  
  // Calculate which slice to show based on mouse position
  let x = constrain(mouseX, 0, img.width);
  
  // Draw the slit-scan slice effect
  for (let i = 0; i < width; i += slitWidth) {
    let srcX = int(map(i, 0, width, 0, img.width));
    let srcW = slitWidth;
    copy(img, srcX, 0, srcW, img.height, i, 0, slitWidth, height);
  }
  
  // Orb / light effect
  noStroke();
  fill(255, 255, 255, 50);
  ellipse(mouseX, mouseY, 100, 100);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}
