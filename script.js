const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 900;
canvas.height = 600;

// ------------------
// Grid
// ------------------
const SIZE = 80;

let bottom = new Array(12).fill("empty");
let birds = new Array(12).fill("empty");

// ------------------
// Game values
// ------------------
let oxygen = 50;
let co2 = 40;
let running = false;

let startTime = 0;
const ROUND_TIME = 20;

// ------------------
// Leaderboard
// ------------------
let scores = JSON.parse(localStorage.getItem("ecoScores")) || [];

// ------------------
// Particles
// ------------------
class Particle {
  constructor(x, y, color, area) {
    this.x = x;
    this.y = y;
    this.vx = (Math.random() - 0.5) * 4;
    this.vy = (Math.random() - 0.5) * 4;
    this.color = color;
    this.area = area;
  }

  update() {
    this.vx += (Math.random() - 0.5) * 0.5;
    this.vy += (Math.random() - 0.5) * 0.5;

    this.x += this.vx;
    this.y += this.vy;

    if (this.x < this.area.x || this.x > this.area.x + this.area.w) {
      this.vx *= -0.5;
    }
    if (this.y < this.area.y || this.y > this.area.y + this.area.h) {
      this.vy *= -0.5;
    }
  }

  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, 5, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

let o2Particles = [];
let co2Particles = [];

const O2_AREA = { x: 0, y: 0, w: 450, h: 180 };
const CO2_AREA = { x: 450, y: 0, w: 450, h: 180 };

function syncParticles(value, particles, color, area) {
  let target = Math.floor(value);

  while (particles.length < target) {
    particles.push(
      new Particle(
        area.x + Math.random() * area.w,
        area.y + Math.random() * area.h,
        color,
        area
      )
    );
  }

  particles.length = target;
}

// ------------------
// Add / Remove
// ------------------
function add(type) {
  for (let i = 0; i < bottom.length; i++) {
    if (bottom[i] === "empty") {
      bottom[i] = type;
      return;
    }
  }
}

function remove(type) {
  for (let i = bottom.length - 1; i >= 0; i--) {
    if (bottom[i] === type) {
      bottom[i] = "empty";
      return;
    }
  }
}

function addBird() {
  for (let i = 0; i < birds.length; i++) {
    if (birds[i] === "empty") {
      birds[i] = "bird";
      return;
    }
  }
}

function removeBird() {
  for (let i = birds.length - 1; i >= 0; i--) {
    if (birds[i] === "bird") {
      birds[i] = "empty";
      return;
    }
  }
}

function startGame() {
  bottom.fill("empty");
  birds.fill("empty");
  oxygen = 50;
  co2 = 40;
  running = true;
  startTime = Date.now();
}

// ------------------
// Logic
// ------------------
function count(arr, type) {
  return arr.filter(x => x === type).length;
}

function update() {
  if (!running) return;

  let trees = count(bottom, "tree");
  let lakes = count(bottom, "lake");
  let dinos = count(bottom, "dino");
  let birdCount = count(birds, "bird");

  oxygen += trees * 0.8 + lakes * 0.5 - dinos * 1.0 - birdCount * 0.4;
  co2 += dinos * 1.2 + birdCount * 0.4 - trees * 0.8 - lakes * 0.5;

  oxygen = Math.max(0, Math.min(100, oxygen));
  co2 = Math.max(0, Math.min(100, co2));

  // Death rules
  if (oxygen < 10 || co2 > 80) remove("dino");
  if (oxygen < 20 || co2 > 60) removeBird();

  // Particles sync
  syncParticles(oxygen, o2Particles, "blue", O2_AREA);
  syncParticles(co2, co2Particles, "red", CO2_AREA);

  let elapsed = (Date.now() - startTime) / 1000;
  if (elapsed >= ROUND_TIME) {
    running = false;
    endGame();
  }
}

function getBiodiversity() {
  return (count(birds, "bird") + count(bottom, "dino")) / 24 * 100;
}

// ------------------
// End Game
// ------------------
function endGame() {
  let name = prompt("Dein Name?");
  if (!name) name = "NoName";

  let score = getBiodiversity();

  scores.push({ name, score });
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, 10);

  localStorage.setItem("ecoScores", JSON.stringify(scores));

  alert("Score gespeichert!");
}

// ------------------
// Drawing
// ------------------
function drawBox(x, y, type) {
  ctx.strokeRect(x, y, SIZE, SIZE);

  if (type === "tree") ctx.fillText("🌳", x + 20, y + 50);
  if (type === "lake") ctx.fillText("💧", x + 20, y + 50);
  if (type === "dino") ctx.fillText("🦖", x + 20, y + 50);
  if (type === "bird") ctx.fillText("🐦", x + 20, y + 50);
}

function drawLeaderboard() {
  ctx.fillText("Leaderboard:", 600, 250);

  scores.forEach((s, i) => {
    ctx.fillText(
      (i + 1) + ". " + s.name + " - " + s.score.toFixed(1) + "%",
      600,
      280 + i * 20
    );
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Particles
  o2Particles.forEach(p => {
    p.update();
    p.draw();
  });

  co2Particles.forEach(p => {
    p.update();
    p.draw();
  });

  ctx.font = "30px Arial";

  // Birds
  for (let i = 0; i < 12; i++) {
    let x = 50 + (i % 6) * (SIZE + 10);
    let y = 50 + Math.floor(i / 6) * (SIZE + 10);
    drawBox(x, y, birds[i]);
  }

  // Bottom
  for (let i = 0; i < 12; i++) {
    let x = 50 + (i % 6) * (SIZE + 10);
    let y = 250 + Math.floor(i / 6) * (SIZE + 10);
    drawBox(x, y, bottom[i]);
  }

  ctx.font = "18px Arial";

  ctx.fillText("O2: " + oxygen.toFixed(1), 600, 100);
  ctx.fillText("CO2: " + co2.toFixed(1), 600, 130);
  ctx.fillText("Biodiversity: " + getBiodiversity().toFixed(1) + "%", 600, 160);

  if (running) {
    let remaining = ROUND_TIME - (Date.now() - startTime) / 1000;
    ctx.fillText("Time: " + remaining.toFixed(0), 600, 190);
  }

  drawLeaderboard();
}

// ------------------
// Loop
// ------------------
function loop() {
  update();
  draw();
  requestAnimationFrame(loop);
}

loop();