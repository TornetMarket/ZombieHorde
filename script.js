// Get canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas dimensions (80% of window dimensions)
canvas.width = window.innerWidth * 0.8;
canvas.height = window.innerHeight * 0.8;

// Player object (center of canvas)
const player = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 15,
};

// Game state variables
let ammo = 10;
let money = 0;
let isGameOver = false;
let spawnInterval = null;
let lastTouchTime = 0;

// Audio soundtrack
const soundtrack = new Audio('115.mp3');
soundtrack.loop = true;

const ammoDisplay = document.getElementById('ammoCount');
const moneyDisplay = document.getElementById('moneyCount');
const buyAmmoBtn = document.getElementById('buyAmmoBtn');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');

let bullets = [];
let zombies = [];

// Update the UI displays
function updateUI() {
  ammoDisplay.textContent = ammo;
  moneyDisplay.textContent = money;
}

// Bullet constructor
function Bullet(x, y, angle) {
  this.x = x;
  this.y = y;
  this.radius = 5;
  this.speed = 7;
  this.vx = Math.cos(angle) * this.speed;
  this.vy = Math.sin(angle) * this.speed;
}

// Zombie constructor
function Zombie(x, y) {
  this.x = x;
  this.y = y;
  this.radius = 20;
  this.speed = 1.5;
}

// Spawn a zombie from a random edge of the canvas
function spawnZombie() {
  let edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
  let x, y;
  if (edge === 0) { // top
    x = Math.random() * canvas.width;
    y = 0;
  } else if (edge === 1) { // right
    x = canvas.width;
    y = Math.random() * canvas.height;
  } else if (edge === 2) { // bottom
    x = Math.random() * canvas.width;
    y = canvas.height;
  } else { // left
    x = 0;
    y = Math.random() * canvas.height;
  }
  zombies.push(new Zombie(x, y));
}

// Handle click/tap to shoot bullets
function shootBullet(x, y) {
  if (ammo > 0) {
    const angle = Math.atan2(y - player.y, x - player.x);
    bullets.push(new Bullet(player.x, player.y, angle));
    ammo--;
    updateUI();
  }
}

// Prevent double shooting on mobile by checking touch timing
canvas.addEventListener('click', (event) => {
  if (Date.now() - lastTouchTime < 500) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  shootBullet(mouseX, mouseY);
});

canvas.addEventListener('touchstart', (event) => {
  event.preventDefault();
  lastTouchTime = Date.now();
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches[0];
  const touchX = touch.clientX - rect.left;
  const touchY = touch.clientY - rect.top;
  shootBullet(touchX, touchY);
});

// Buy ammo button event
buyAmmoBtn.addEventListener('click', () => {
  const cost = 20;
  const ammoGain = 5;
  if (money >= cost) {
    money -= cost;
    ammo += ammoGain;
    updateUI();
  }
});

// Simple collision detection between two circular objects
function isColliding(obj1, obj2) {
  const dx = obj1.x - obj2.x;
  const dy = obj1.y - obj2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < obj1.radius + obj2.radius;
}

// Main game loop
function update() {
  if (isGameOver) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the player
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#00f'; // blue
  ctx.fill();
  ctx.closePath();

  // Update and draw bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;

    // Remove bullet if out of bounds
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
      bullets.splice(i, 1);
      continue;
    }

    // Draw bullet
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0'; // yellow
    ctx.fill();
    ctx.closePath();

    // Check for collisions with zombies
    for (let j = zombies.length - 1; j >= 0; j--) {
      const z = zombies[j];
      if (isColliding(b, z)) {
        zombies.splice(j, 1);
        bullets.splice(i, 1);
        money += 10;
        updateUI();
        break;
      }
    }
  }

  // Update and draw zombies
  for (let i = zombies.length - 1; i >= 0; i--) {
    const z = zombies[i];
    const angle = Math.atan2(player.y - z.y, player.x - z.x);
    z.x += Math.cos(angle) * z.speed;
    z.y += Math.sin(angle) * z.speed;

    // Draw zombie in red
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#f00';
    ctx.fill();
    ctx.closePath();

    // Check collision with player (game over)
    if (isColliding(z, player)) {
      isGameOver = true;
      clearInterval(spawnInterval);
      finalScoreDisplay.textContent = "Game Over! You scored: $" + money;
      gameOverScreen.classList.remove("hidden");
      return;
    }
  }

  requestAnimationFrame(update);
}

// Reset game state
function resetGame() {
  bullets = [];
  zombies = [];
  ammo = 10;
  money = 0;
  isGameOver = false;
  updateUI();
}

// Start game (called from start popup)
function startGame() {
  resetGame();
  startScreen.classList.add("hidden");
  soundtrack.play();
  spawnInterval = setInterval(() => {
    if (!isGameOver) spawnZombie();
  }, 1000);
  update();
}

// Restart game (called from game over popup)
function restartGame() {
  resetGame();
  gameOverScreen.classList.add("hidden");
  soundtrack.play();
  spawnInterval = setInterval(() => {
    if (!isGameOver) spawnZombie();
  }, 1000);
  update();
}

// Event listeners for start and restart buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);
