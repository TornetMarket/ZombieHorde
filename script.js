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

// Global game state variables
let ammo, money, health, maxHealth;
let isGameOver = false, spawnInterval = null, roundInterval = null, lastTouchTime = 0;
let startingAmmo = 10;         // Default for Easy
let currentZombieSpeed = 1.5;    // Default for Easy
let zombieSpawnCount = 1;        // Number of zombies to spawn each cycle
let baseZombieSpawnCount = 1;    // To hold the initial spawn count based on difficulty
let currentRound = 1;            // Round counter
let juggernogPurchased = false;

// Audio soundtrack (115.mp3) and laugh sound (laugh.mp3)
const soundtrack = new Audio('115.mp3');
soundtrack.loop = true;
const laughSound = new Audio('laugh.mp3');  // Plays each round

// UI Elements
const ammoDisplay = document.getElementById('ammoCount');
const moneyDisplay = document.getElementById('moneyCount');
const buyAmmoBtn = document.getElementById('buyAmmoBtn');
const buyPerkBtn = document.getElementById('buyPerkBtn');
const buyMedkitBtn = document.getElementById('buyMedkitBtn');
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

// Zombie constructor (speed set based on currentZombieSpeed)
function Zombie(x, y) {
  this.x = x;
  this.y = y;
  this.radius = 20;
  this.speed = currentZombieSpeed;
}

// Spawn a zombie from a random edge of the canvas
function spawnZombie() {
  let edge = Math.floor(Math.random() * 4); // 0: top, 1: right, 2: bottom, 3: left
  let x, y;
  if (edge === 0) {
    x = Math.random() * canvas.width;
    y = 0;
  } else if (edge === 1) {
    x = canvas.width;
    y = Math.random() * canvas.height;
  } else if (edge === 2) {
    x = Math.random() * canvas.width;
    y = canvas.height;
  } else {
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

// Buy Juggernog perk event (sets max health to 200)
buyPerkBtn.addEventListener('click', () => {
  const cost = 200;
  if (!juggernogPurchased && money >= cost) {
    money -= cost;
    health = 200;
    maxHealth = 200;
    juggernogPurchased = true;
    buyPerkBtn.disabled = true;
    buyPerkBtn.innerText = "Juggernog Purchased!";
    updateUI();
  }
});

// Buy Medkit event (fully regenerates health)
buyMedkitBtn.addEventListener('click', () => {
  const cost = 300;
  if (money >= cost) {
    money -= cost;
    health = maxHealth;
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

// Draw the health bar above the survivor using maxHealth
function drawHealthBar() {
  const barWidth = 40;
  const barHeight = 5;
  const x = player.x - barWidth / 2;
  const y = player.y - player.radius - 15;
  
  // Background
  ctx.fillStyle = "#555";
  ctx.fillRect(x, y, barWidth, barHeight);
  
  // Current health (green), scaled to maxHealth
  const healthPercent = Math.max(0, health) / maxHealth;
  ctx.fillStyle = "#0f0";
  ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
  
  // Border
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(x, y, barWidth, barHeight);
}

// Draw the current round in the top left corner
function drawRoundInfo() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText("Round: " + currentRound, 10, 20);
}

// Update round progression
function updateRound() {
  currentRound++;
  // Increase zombie speed slightly each round
  currentZombieSpeed += 0.2;
  // From round 6 onward, double the zombie spawn count based on baseZombieSpawnCount
  if (currentRound >= 6) {
    zombieSpawnCount = baseZombieSpawnCount * 2;
  } else {
    zombieSpawnCount = baseZombieSpawnCount;
  }
  // Play the laugh sound for this round without interrupting the main soundtrack
  laughSound.currentTime = 0;
  laughSound.play();
}

// Main game loop
function update() {
  if (isGameOver) return;
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw round info (top left)
  drawRoundInfo();
  
  // Draw the player
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#00f';
  ctx.fill();
  ctx.closePath();
  
  // Draw the health bar above the player
  drawHealthBar();
  
  // Draw nametag below the player
  ctx.font = "14px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("Richtofen", player.x, player.y + player.radius + 15);
  
  // Update and draw bullets
  for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.x += b.vx;
    b.y += b.vy;
    
    if (b.x < 0 || b.x > canvas.width || b.y < 0 || b.y > canvas.height) {
      bullets.splice(i, 1);
      continue;
    }
    
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#ff0';
    ctx.fill();
    ctx.closePath();
    
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
    
    ctx.beginPath();
    ctx.arc(z.x, z.y, z.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#f00';
    ctx.fill();
    ctx.closePath();
    
    if (isColliding(z, player)) {
      zombies.splice(i, 1);
      health -= 33;
      if (health <= 0) {
        isGameOver = true;
        clearInterval(spawnInterval);
        clearInterval(roundInterval);
        finalScoreDisplay.textContent = "Game Over! You survived " + currentRound + " rounds. You scored: $" + money;
        gameOverScreen.classList.remove("hidden");
        return;
      }
    }
  }
  
  requestAnimationFrame(update);
}

// Reset game state
function resetGame() {
  bullets = [];
  zombies = [];
  ammo = startingAmmo;
  money = 0;
  health = 100;
  maxHealth = 100;
  currentRound = 1;
  juggernogPurchased = false;
  buyPerkBtn.disabled = false;
  buyPerkBtn.innerText = "Buy Juggernog ($200)";
  isGameOver = false;
  updateUI();
  // Clear any existing round timer
  if (roundInterval) clearInterval(roundInterval);
}

// Start game (called from start popup)
function startGame() {
  const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
  if (difficulty === "easy") {
    startingAmmo = 10;
    currentZombieSpeed = 1.5;
    zombieSpawnCount = 1;
  } else if (difficulty === "hard") {
    startingAmmo = 8;
    currentZombieSpeed = 2.0;
    zombieSpawnCount = 1;
  } else if (difficulty === "veteran") {
    startingAmmo = 5;
    currentZombieSpeed = 3.0;
    zombieSpawnCount = 2;
  }
  // Store base spawn count for round-based modifications
  baseZombieSpawnCount = zombieSpawnCount;
  
  resetGame();
  startScreen.classList.add("hidden");
  soundtrack.play();
  
  // Spawn zombies every second
  spawnInterval = setInterval(() => {
    if (!isGameOver) {
      for (let i = 0; i < zombieSpawnCount; i++) {
        spawnZombie();
      }
    }
  }, 1000);
  
  // Start round timer: every 85 seconds, advance the round and play laugh sound
  roundInterval = setInterval(() => {
    if (!isGameOver) {
      updateRound();
    }
  }, 85000);
  
  update();
}

// Restart game (called from game over popup)
function restartGame() {
  resetGame();
  gameOverScreen.classList.add("hidden");
  soundtrack.play();
  spawnInterval = setInterval(() => {
    if (!isGameOver) {
      for (let i = 0; i < zombieSpawnCount; i++) {
        spawnZombie();
      }
    }
  }, 1000);
  roundInterval = setInterval(() => {
    if (!isGameOver) {
      updateRound();
    }
  }, 85000);
  update();
}

// Event listeners for start and restart buttons
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);
