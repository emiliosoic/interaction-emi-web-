let walls = [];
let particle;
let backgroundRays = [];
let wallCount = 20;
let rayCount = 10;
let dynamicWalls = true;

const canvasWidth = 1920;
const canvasHeight = 1080;

function setup() {
  let canvas = createCanvas(canvasWidth, canvasHeight);
  canvas.style('display', 'block');
  setupWalls();
  particle = new Particle();
  setupBackgroundRays();
  noCursor();
}

function draw() {
  background(0);

  drawBackgroundSphere();
  if (dynamicWalls) moveWalls();

  walls.forEach(wall => wall.show());
  drawHeartbeatCircles();
  
  particle.update(mouseX, mouseY);
  particle.show();
  particle.look(walls);

  drawBackgroundRays();
  drawWaveInteraction();
}

// ---------------- WALLS ----------------

function setupWalls() {
  walls = [];
  let centerX = width / 2;
  let centerY = height / 2;

  for (let i = 0; i < wallCount; i++) {
    let angle = (TWO_PI / wallCount) * i;
    let x1 = centerX;
    let y1 = centerY;
    let x2 = centerX + cos(angle) * width / 4;
    let y2 = centerY + sin(angle) * height / 4;
    walls.push(new Boundary(x1, y1, x2, y2));
  }

  walls.push(new Boundary(0, 0, width, 0));
  walls.push(new Boundary(width, 0, width, height));
  walls.push(new Boundary(width, height, 0, height));
  walls.push(new Boundary(0, height, 0, 0));
}

function moveWalls() {
  let centerX = width / 2;
  let centerY = height / 2;

  walls.forEach((wall, i) => {
    if (i >= wallCount) return;

    let angle = (TWO_PI / wallCount) * i + frameCount * 0.005;
    let radius = width / 4 + sin(frameCount * 0.02 + i) * 20;

    wall.a.set(centerX, centerY);
    wall.b.set(centerX + cos(angle) * radius, centerY + sin(angle) * radius);
  });
}

// ---------------- INTERACTIONS ----------------

function keyPressed() {
  if (key === 'd') dynamicWalls = !dynamicWalls;
  if (key === 'w') wallCount = (wallCount + 5) % 30;
}

// ---------------- BACKGROUND ----------------

function setupBackgroundRays() {
  let centerX = width / 2;
  let centerY = height / 2;
  backgroundRays = [];

  for (let angle = 0; angle < 360; angle += rayCount) {
    backgroundRays.push(new Ray(createVector(centerX, centerY), radians(angle)));
  }
}

function drawBackgroundSphere() {
  fill(0, 0, 255, 100);
  noStroke();
  ellipse(width / 2, height / 2, 400 + sin(frameCount * 0.05) * 20);
}

function drawBackgroundRays() {
  backgroundRays.forEach(ray => {
    let closest = null;
    let record = Infinity;

    walls.forEach(wall => {
      const pt = ray.cast(wall);
      if (pt) {
        const d = p5.Vector.dist(ray.pos, pt);
        if (d < record) {
          record = d;
          closest = pt;
        }
      }
    });

    if (closest) {
      stroke(0, 0, 255, 150);
      line(ray.pos.x, ray.pos.y, closest.x, closest.y);
    }
  });
}

function drawWaveInteraction() {
  let step = Math.ceil(backgroundRays.length / 5);

  for (let i = 0; i < backgroundRays.length; i += step) {
    let rayA = backgroundRays[i];
    let rayB = particle.rays[i % particle.rays.length];

    if (rayA.pos && rayB.pos) {
      let midX = (rayA.pos.x + rayB.pos.x) / 2;
      let midY = (rayA.pos.y + rayB.pos.y) / 2;
      midX += sin(frameCount * 0.05 + i) * 20;
      midY += cos(frameCount * 0.05 + i) * 20;

      noFill();
      stroke(255, 255, 0, 150);
      strokeWeight(2);
      bezier(rayA.pos.x, rayA.pos.y, midX, midY, midX, midY, rayB.pos.x, rayB.pos.y);
    }
  }
}

function drawHeartbeatCircles() {
  push();
  translate(width / 2, height / 2);
  strokeWeight(2);
  noFill();

  let pulse = map(sin(frameCount * 0.05), -1, 1, -10, 10);

  for (let i = 0; i < 5; i++) {
    stroke(255, 100, 200, 150 - i * 30);
    let radius = 100 + i * 50 + pulse * (i + 1);
    ellipse(0, 0, radius, radius);
  }
  pop();
}

// ---------------- CLASSES ----------------

class Boundary {
  constructor(x1, y1, x2, y2) {
    this.a = createVector(x1, y1);
    this.b = createVector(x2, y2);
  }

  show() {
    stroke(255);
    line(this.a.x, this.a.y, this.b.x, this.b.y);
  }
}

class Ray {
  constructor(pos, angle) {
    this.pos = pos;
    this.dir = p5.Vector.fromAngle(angle);
  }

  cast(wall) {
    const { x: x1, y: y1 } = wall.a;
    const { x: x2, y: y2 } = wall.b;
    const { x: x3, y: y3 } = this.pos;
    const { x: x4, y: y4 } = p5.Vector.add(this.pos, this.dir);

    const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (den === 0) return null;

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / den;

    return (t > 0 && t < 1 && u > 0) ? createVector(x1 + t * (x2 - x1), y1 + t * (y2 - y1)) : null;
  }
}

class Particle {
  constructor() {
    this.pos = createVector(width / 2, height / 2);
    this.rays = [];
    for (let a = 0; a < 360; a += rayCount) {
      this.rays.push(new Ray(this.pos, radians(a)));
    }
  }

  update(x, y) {
    this.pos.set(x, y);
  }

  look(walls) {
    for (let ray of this.rays) {
      let closest = null;
      let record = Infinity;
      for (let wall of walls) {
        const pt = ray.cast(wall);
        if (pt && p5.Vector.dist(this.pos, pt) < record) {
          record = p5.Vector.dist(this.pos, pt);
          closest = pt;
        }
      }
      if (closest) line(this.pos.x, this.pos.y, closest.x, closest.y);
    }
  }

  show() {
    fill(255);
    noStroke();
    ellipse(this.pos.x, this.pos.y, 6);
  }
}

