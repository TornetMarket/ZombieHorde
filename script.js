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
let isGameOver = false, gamePaused = false, spawnInterval = null, roundInterval = null, lastTouchTime = 0;
let startingAmmo = 10;          // Default for Easy
let currentZombieSpeed = 1.5;   // Default for Easy
let zombieSpawnCount = 1;       // Zombies spawned each cycle
let baseZombieSpawnCount = 1;   // Initial spawn count (from difficulty)
let currentRound = 1;           // Round counter
let juggernogPurchased = false;
let devGodmode = false;         // Developer Godmode flag

// Auto-fire variables
let autoFireEnabled = false;
let autoFireInterval = null;
let autoFireX = 0, autoFireY = 0;

// Audio objects
const soundtrack = new Audio('115.mp3');
soundtrack.loop = true;
const laughSound = new Audio('laugh.mp3');

// UI Elements
const ammoDisplay = document.getElementById('ammoCount');
const moneyDisplay = document.getElementById('moneyCount');
const buyAmmoBtn = document.getElementById('buyAmmoBtn');
const buyPerkBtn = document.getElementById('buyPerkBtn');
const buyMedkitBtn = document.getElementById('buyMedkitBtn');
const packPunchBtn = document.getElementById('packPunchBtn');
const devModeBtn = document.getElementById('devModeBtn');
const packPunchContainer = document.getElementById('packPunchContainer');
const upgradeGunBtn = document.getElementById('upgradeGunBtn');
const devContainer = document.getElementById('devContainer');
const devCloseBtn = document.getElementById('devCloseBtn');
const devPasswordSection = document.getElementById('devPasswordSection');
const devPasswordInput = document.getElementById('devPasswordInput');
const devSubmitBtn = document.getElementById('devSubmitBtn');
const devError = document.getElementById('devError');
const devOptions = document.getElementById('devOptions');
const godmodeBtn = document.getElementById('godmodeBtn');
const maxAmmoBtn = document.getElementById('maxAmmoBtn');
const giveMoneyBtn = document.getElementById('giveMoneyBtn');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreDisplay = document.getElementById('finalScore');
const restartBtn = document.getElementById('restartBtn');
const changeDifficultyBtn = document.getElementById('changeDifficultyBtn');
const startScreen = document.getElementById('startScreen');
const startBtn = document.getElementById('startBtn');

let bullets = [];
let zombies = [];

// Update UI displays
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
  this.speed = currentZombieSpeed;
}

// Spawn a zombie from a random edge
function spawnZombie() {
  let edge = Math.floor(Math.random() * 4);
  let x, y;
  if (edge === 0) { x = Math.random() * canvas.width; y = 0; }
  else if (edge === 1) { x = canvas.width; y = Math.random() * canvas.height; }
  else if (edge === 2) { x = Math.random() * canvas.width; y = canvas.height; }
  else { x = 0; y = Math.random() * canvas.height; }
  zombies.push(new Zombie(x, y));
}

// Shoot a bullet toward (x,y)
function shootBullet(x, y) {
  if (ammo > 0) {
    const angle = Math.atan2(y - player.y, x - player.x);
    bullets.push(new Bullet(player.x, player.y, angle));
    ammo--;
    updateUI();
  }
}

// Click event for shooting (if auto-fire not enabled)
canvas.addEventListener('click', (event) => {
  if (autoFireEnabled) return;
  if (Date.now() - lastTouchTime < 500) return;
  const rect = canvas.getBoundingClientRect();
  const mouseX = event.clientX - rect.left;
  const mouseY = event.clientY - rect.top;
  shootBullet(mouseX, mouseY);
});

// Touchstart for shooting / auto-fire
canvas.addEventListener('touchstart', (event) => {
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches[0];
  const touchX = touch.clientX - rect.left;
  const touchY = touch.clientY - rect.top;
  if (autoFireEnabled) {
    autoFireX = touchX;
    autoFireY = touchY;
    shootBullet(autoFireX, autoFireY);
    autoFireInterval = setInterval(() => {
      shootBullet(autoFireX, autoFireY);
    }, 150);
  } else {
    shootBullet(touchX, touchY);
  }
});

// Touchmove for auto-fire
canvas.addEventListener('touchmove', (event) => {
  if (!autoFireEnabled) return;
  event.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = event.touches[0];
  autoFireX = touch.clientX - rect.left;
  autoFireY = touch.clientY - rect.top;
});

// Touchend for auto-fire
canvas.addEventListener('touchend', () => {
  if (autoFireInterval) {
    clearInterval(autoFireInterval);
    autoFireInterval = null;
  }
});

// Mousedown for auto-fire (upgraded gun)
canvas.addEventListener('mousedown', (event) => {
  if (!autoFireEnabled) return;
  const rect = canvas.getBoundingClientRect();
  autoFireX = event.clientX - rect.left;
  autoFireY = event.clientY - rect.top;
  shootBullet(autoFireX, autoFireY);
  autoFireInterval = setInterval(() => {
    shootBullet(autoFireX, autoFireY);
  }, 150);
});

// Mousemove for auto-fire
canvas.addEventListener('mousemove', (event) => {
  if (!autoFireEnabled) return;
  const rect = canvas.getBoundingClientRect();
  autoFireX = event.clientX - rect.left;
  autoFireY = event.clientY - rect.top;
});

// Mouseup for auto-fire
canvas.addEventListener('mouseup', () => {
  if (autoFireInterval) {
    clearInterval(autoFireInterval);
    autoFireInterval = null;
  }
});

// Buy ammo event
buyAmmoBtn.addEventListener('click', () => {
  const cost = 20, ammoGain = 5;
  if (money >= cost) {
    money -= cost;
    ammo += ammoGain;
    updateUI();
  }
});

// Buy Juggernog event
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

// Buy Medkit event
buyMedkitBtn.addEventListener('click', () => {
  const cost = 300;
  if (money >= cost) {
    money -= cost;
    health = maxHealth;
    updateUI();
  }
});

// "Pack a Punch" button event
packPunchBtn.addEventListener('click', () => {
  const cost = 1000;
  if (money >= cost && !gamePaused) {
    money -= cost;
    updateUI();
    clearInterval(spawnInterval);
    clearInterval(roundInterval);
    gamePaused = true;
    laughSound.currentTime = 0;
    laughSound.play();
    packPunchContainer.classList.remove('hidden');
  }
});

// "Upgrade Gun" in Pack a Punch overlay
upgradeGunBtn.addEventListener('click', () => {
  autoFireEnabled = true;
  ammo += 300;
  updateUI();
  packPunchContainer.classList.add('hidden');
  gamePaused = false;
  spawnInterval = setInterval(() => {
    if (!isGameOver) {
      for (let i = 0; i < zombieSpawnCount; i++) {
        spawnZombie();
      }
    }
  }, 1000);
  roundInterval = setInterval(() => {
    if (!isGameOver) { updateRound(); }
  }, 85000);
});

// "Developer Mode" button event
devModeBtn.addEventListener('click', () => {
  if (!gamePaused) {
    clearInterval(spawnInterval);
    clearInterval(roundInterval);
    gamePaused = true;
  }
  laughSound.currentTime = 0;
  laughSound.play();
  devPasswordSection.style.display = 'block';
  devOptions.classList.add('hidden');
  devContainer.classList.remove('hidden');
});

// Developer password submission
devSubmitBtn.addEventListener('click', () => {
  const password = devPasswordInput.value;
  if (password === "admin") {
    devError.style.display = 'none';
    devPasswordSection.style.display = 'none';
    devOptions.classList.remove('hidden');
  } else {
    devError.style.display = 'block';
  }
});

// Developer mode options
godmodeBtn.addEventListener('click', () => {
  devGodmode = true;
});
maxAmmoBtn.addEventListener('click', () => {
  ammo = 10000000;
  updateUI();
});
giveMoneyBtn.addEventListener('click', () => {
  money += 1000;
  updateUI();
});

// Developer container close button
devCloseBtn.addEventListener('click', () => {
  devContainer.classList.add('hidden');
  // Clear password input
  devPasswordInput.value = "";
  devError.style.display = 'none';
  // Resume game
  gamePaused = false;
  spawnInterval = setInterval(() => {
    if (!isGameOver) {
      for (let i = 0; i < zombieSpawnCount; i++) {
        spawnZombie();
      }
    }
  }, 1000);
  roundInterval = setInterval(() => {
    if (!isGameOver) { updateRound(); }
  }, 85000);
});

// Simple collision detection
function isColliding(obj1, obj2) {
  const dx = obj1.x - obj2.x, dy = obj1.y - obj2.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance < obj1.radius + obj2.radius;
}

// Draw health bar
function drawHealthBar() {
  const barWidth = 40, barHeight = 5;
  const x = player.x - barWidth / 2, y = player.y - player.radius - 15;
  ctx.fillStyle = "#555";
  ctx.fillRect(x, y, barWidth, barHeight);
  const healthPercent = Math.max(0, health) / maxHealth;
  ctx.fillStyle = "#0f0";
  ctx.fillRect(x, y, barWidth * healthPercent, barHeight);
  ctx.strokeStyle = "#fff";
  ctx.strokeRect(x, y, barWidth, barHeight);
}

// Draw round info
function drawRoundInfo() {
  ctx.font = "16px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "left";
  ctx.fillText("Round: " + currentRound, 10, 20);
}

// Update round progression
function updateRound() {
  currentRound++;
  currentZombieSpeed += 0.2;
  if (currentRound >= 6) {
    zombieSpawnCount = baseZombieSpawnCount * 2;
  } else {
    zombieSpawnCount = baseZombieSpawnCount;
  }
  laughSound.currentTime = 0;
  laughSound.play();
}

// Main game loop
function update() {
  if (isGameOver) return;
  if (gamePaused) {
    requestAnimationFrame(update);
    return;
  }
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRoundInfo();
  ctx.beginPath();
  ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#00f';
  ctx.fill();
  ctx.closePath();
  drawHealthBar();
  ctx.font = "14px Arial";
  ctx.fillStyle = "#fff";
  ctx.textAlign = "center";
  ctx.fillText("Richtofen", player.x, player.y + player.radius + 15);
  
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
      if (!devGodmode) { health -= 33; }
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
  devGodmode = false;
  autoFireEnabled = false;
  buyPerkBtn.disabled = false;
  buyPerkBtn.innerText = "Buy Juggernog ($200)";
  isGameOver = false;
  updateUI();
  if (roundInterval) clearInterval(roundInterval);
}

// Start game from start screen
function startGame() {
  const difficulty = document.querySelector('input[name="difficulty"]:checked').value;
  if (difficulty === "easy") { startingAmmo = 10; currentZombieSpeed = 1.5; zombieSpawnCount = 1; }
  else if (difficulty === "hard") { startingAmmo = 10; currentZombieSpeed = 2.0; zombieSpawnCount = 1; }
  else if (difficulty === "veteran") { startingAmmo = 5; currentZombieSpeed = 3.0; zombieSpawnCount = 2; }
  baseZombieSpawnCount = zombieSpawnCount;
  resetGame();
  startScreen.classList.add("hidden");
  soundtrack.play();
  spawnInterval = setInterval(() => {
    if (!isGameOver) {
      for (let i = 0; i < zombieSpawnCount; i++) { spawnZombie(); }
    }
  }, 1000);
  roundInterval = setInterval(() => { if (!isGameOver) { updateRound(); } }, 85000);
  update();
}

// Restart game (same difficulty)
function restartGame() {
  resetGame();
  gameOverScreen.classList.add("hidden");
  soundtrack.play();
  spawnInterval = setInterval(() => {
    if (!isGameOver) {
      for (let i = 0; i < zombieSpawnCount; i++) { spawnZombie(); }
    }
  }, 1000);
  roundInterval = setInterval(() => { if (!isGameOver) { updateRound(); } }, 85000);
  update();
}

// Change difficulty: hide game over and show start screen
function changeDifficulty() {
  clearInterval(spawnInterval);
  clearInterval(roundInterval);
  gameOverScreen.classList.add("hidden");
  startScreen.classList.remove("hidden");
  resetGame();
}

// Event listeners for start, restart, and change difficulty
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', restartGame);
changeDifficultyBtn.addEventListener('click', changeDifficulty);
