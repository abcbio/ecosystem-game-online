const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

canvas.width = 900;
canvas.height = 600;

// ------------------
// Bilder laden (PNG)
// ------------------
const images = {
  tree: new Image(),
  lake: new Image(),
  dino: new Image(),
  bird: new Image()
};

images.tree.src = "tree.png";
images.lake.src = "lake.png";
images.dino.src = "dino.png";
images.bird.src = "bird.png";

// Preload
let loadedImages = 0;
const totalImages = Object.keys(images).length;

for (let key in images) {
  images[key].onload = () => {
    loadedImages++;
  };
}

// ------------------
// Grid
// ------------------
const SIZE = 80;

let bottom = new Array(12).fill("empty");
let birds = new Array(12).fill("empty");

// ------------------
// Game values
// ------------------
let oxygen = 21;
let co2 = 0.03;
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

const O2_AREA = { x: 50, y: 20, w: 800, h: 50 };
const CO2_AREA = { x: 50, y: 20, w: 800, h: 50 };

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
  oxygen = 21;
  co2 = 0.03;
  running = true;
  startTime = Date.now();

  // ✅ Spielanzahl erhöhen
  let plays = localStorage.getItem("playCount");
  plays = plays ? parseInt(plays) : 0;
  plays++;

  localStorage.setItem("playCount", plays);
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

  oxygen += trees * 0.001 + lakes * 0.001 - dinos * 0.001 - birdCount * 0.001;
  co2 += dinos * 0.0001 + birdCount * 0.00005 - trees * 0.00001 - lakes * 0.0001;

  oxygen = Math.max(0, Math.min(25, oxygen));
  co2 = Math.max(0, Math.min(0.08, co2));

  if (oxygen < 15 || co2 > 0.07) remove("dino");
  if (oxygen < 20 || co2 > 0.07) removeBird();

  syncParticles(oxygen, o2Particles, "blue", O2_AREA);
  syncParticles(co2*100, co2Particles, "red", CO2_AREA);

  let elapsed = (Date.now() - startTime) / 1000;
  if (elapsed >= ROUND_TIME) {
    running = false;
    endGame();
  }
}

function getBiodiversity() {  return (    (count(birds, "bird")*3 +     count(bottom, "dino")*3 +     count(bottom, "tree") +     count(bottom, "lake"))     / 70 * 100  );}


// ------------------
// End Game
// ------------------
function endGame() {
  let name = prompt("Your Name?");
  if (!name) name = "NoName";

  let score = getBiodiversity();

  scores.push({ name, score });
  scores.sort((a, b) => b.score - a.score);
  scores = scores.slice(0, 10);

  localStorage.setItem("ecoScores", JSON.stringify(scores));

}

// ------------------
// Drawing (MIT PNGs)
// ------------------
function drawBox(x, y, type) {
  ctx.strokeRect(x, y, SIZE, SIZE);

  if (type === "empty") return;

  const img = images[type];


  if (img && img.complete) {    
	const scale = 1.1; // 👉 Größe anpassen (z.B. 1.2 - 2.0)    
	const w = SIZE * scale;    
	const h = SIZE * scale;    // 👉 zentriert zeichnen → geht über Box hinaus    
	const offsetX = x + SIZE / 2 - w / 2;    
	const offsetY = y + SIZE / 2 - h / 2;    
	ctx.drawImage(img, offsetX, offsetY, w, h);
  }

}


function drawLeaderboard() {
  ctx.font = "12px Arial";
  ctx.fillText("Leaderboard:", 650, 300);

  scores.forEach((s, i) => {
    ctx.fillText(
      (i + 1) + ". " + s.name + " - " + s.score.toFixed(1) + "%",
      650,
      330 + i * 20
    );
  });
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  o2Particles.forEach(p => {
    p.update();
    p.draw();
  });

  co2Particles.forEach(p => {
    p.update();
    p.draw();
  });

  ctx.font = "30px Arial";

  for (let i = 0; i < 12; i++) {
    let x = 50 + (i % 6) * (SIZE + 10);
    let y = 100 + Math.floor(i / 6) * (SIZE + 10);
    drawBox(x, y, birds[i]);
  }

  for (let i = 0; i < 12; i++) {
    let x = 50 + (i % 6) * (SIZE + 10);
    let y = 350 + Math.floor(i / 6) * (SIZE + 10);
    drawBox(x, y, bottom[i]);
  }

  ctx.font = "24px Arial";

  ctx.fillText("O2: " + oxygen.toFixed(1)+ "%", 650, 170);
  ctx.fillText("CO2: " + co2.toFixed(3)+ "%", 650, 200);
  ctx.fillText("Biodiversity: " + getBiodiversity().toFixed(1) + "%", 650, 230);

  ctx.font = "30px Arial";


  if (running) {
    let remaining = ROUND_TIME - (Date.now() - startTime) / 1000;
    ctx.fillText("Time: " + remaining.toFixed(0), 600, 130);
  }

  drawLeaderboard();

  let plays = localStorage.getItem("playCount") || 0;
  ctx.fillText("Played: " + plays, 650, 260);
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