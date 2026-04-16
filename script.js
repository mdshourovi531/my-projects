const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreElement = document.getElementById("current-score");
const highScoreElement = document.getElementById("high-score");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlay-title");
const overlayText = document.getElementById("overlay-text");
const startBtn = document.getElementById("start-btn");

// Instruction UI Elements
const infoBtn = document.getElementById("info-btn");
const instModal = document.getElementById("inst-modal");
const closeInst = document.getElementById("close-inst");

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [];
let dx = 0, dy = 0;
let foodX, foodY;
let score = 0;
let highScore = localStorage.getItem("snakeHighScore") || 0;
let gameLoop;
let baseSpeed = 120;
let currentSpeed = baseSpeed;
let isPlaying = false;
let pulseAngle = 0;

// Special Items & Growth State
let specialItem = null;
let nextSpawnTime = 0;
let pendingGrowth = 0; // Tracks extra blocks to add from Boost

highScoreElement.textContent = highScore;

let audioCtx;
function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
}

function playSound(type) {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    const now = audioCtx.currentTime;

    if (type === 'eat') {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.2, now);
        osc.start(now); osc.stop(now + 0.1);
    } else if (type === 'boost') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.1);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
        gain.gain.setValueAtTime(0.2, now);
        osc.start(now); osc.stop(now + 0.2);
    } else if (type === 'boom') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(40, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        osc.start(now); osc.stop(now + 0.3);
    } else if (type === 'die') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        osc.start(now); osc.stop(now + 0.5);
    }
}

// Modal Handlers
if(infoBtn) {
    infoBtn.onclick = () => {
        instModal.classList.remove("hidden");
        isPlaying = false;
    };
}

if(closeInst) {
    closeInst.onclick = () => {
        instModal.classList.add("hidden");
        // Only resume if the game was already in progress
        if (snake.length > 0 && !overlay.classList.contains("hidden")) {
            // keep paused until Start is pressed
        } else if (snake.length > 0) {
            isPlaying = true;
            tick();
        }
    };
}

function initGame() {
    initAudio();
    snake = [{ x: 10, y: 10 }, { x: 10, y: 11 }, { x: 10, y: 12 }];
    dx = 0; dy = -1;
    score = 0;
    pendingGrowth = 0;
    currentSpeed = baseSpeed;
    scoreElement.textContent = score;
    specialItem = null;
    setNextSpawnTime();
    placeFood();
    isPlaying = true;
    overlay.classList.add("hidden");
    if (gameLoop) clearTimeout(gameLoop);
    tick();
}

function setNextSpawnTime() {
    nextSpawnTime = Date.now() + Math.floor(Math.random() * 2000) + 5000;
}

function spawnSpecialItem() {
    const type = Math.random() > 0.5 ? 'boost' : 'boom';
    let x, y;
    do {
        x = Math.floor(Math.random() * tileCount);
        y = Math.floor(Math.random() * tileCount);
    } while (snake.some(s => s.x === x && s.y === y) || (x === foodX && y === foodY));

    specialItem = { x, y, type, expiresAt: Date.now() + 3000 };
}

function updateSpecialItems() {
    const now = Date.now();
    if (!specialItem && now > nextSpawnTime) {
        spawnSpecialItem();
    }
    if (specialItem && now > specialItem.expiresAt) {
        specialItem = null;
        setNextSpawnTime();
    }
}

function tick() {
    if (!isPlaying) return;
    updateSpecialItems();
    moveSnake();
    checkCollision();
    clearCanvas();
    drawFood();
    if (specialItem) drawSpecialItem();
    drawSnake();
    if (isPlaying) gameLoop = setTimeout(tick, currentSpeed);
}

function clearCanvas() {
    ctx.fillStyle = "rgba(15, 12, 41, 0.9)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawSnake() {
    snake.forEach((segment, index) => {
        ctx.fillStyle = index === 0 ? "#00ffcc" : `rgb(0, ${Math.max(50, 255 - (index * 5))}, 200)`;
        ctx.shadowBlur = index === 0 ? 15 : 0;
        ctx.shadowColor = "#00ffcc";
        ctx.beginPath();
        ctx.roundRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2, 4);
        ctx.fill();
    });
    ctx.shadowBlur = 0;
}

function drawFood() {
    pulseAngle += 0.2;
    const pulseRadius = (gridSize / 2 - 2) + Math.sin(pulseAngle) * 2;
    ctx.fillStyle = "#ff0055";
    ctx.shadowBlur = 20;
    ctx.shadowColor = "#ff0055";
    ctx.beginPath();
    ctx.arc(foodX * gridSize + gridSize / 2, foodY * gridSize + gridSize / 2, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
}

function drawSpecialItem() {
    const { x, y, type } = specialItem;
    ctx.shadowBlur = 15;
    ctx.fillStyle = (type === 'boost') ? "#00ffff" : "#ffaa00";
    ctx.shadowColor = ctx.fillStyle;
    ctx.beginPath();
    ctx.roundRect(x * gridSize + 4, y * gridSize + 2, gridSize - 8, gridSize - 4, 10);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = "white";
    ctx.font = "bold 10px Arial";
    ctx.textAlign = "center";
    ctx.fillText(type === 'boost' ? "+50" : "-70", x * gridSize + gridSize/2, y * gridSize + gridSize/2 + 4);
}

function moveSnake() {
    const head = { x: snake[0].x + dx, y: snake[0].y + dy };
    snake.unshift(head);

    let ateSomething = false;

    // Special Item collision
    if (specialItem && head.x === specialItem.x && head.y === specialItem.y) {
        if (specialItem.type === 'boost') {
            score += 50;
            playSound('boost');
            pendingGrowth += 2; // Adds 2 blocks over time
        } else {
            score = Math.max(0, score - 70);
            playSound('boom');
        }
        scoreElement.textContent = score;
        specialItem = null;
        setNextSpawnTime();
        ateSomething = true;
    }

    // Food collision
    if (head.x === foodX && head.y === foodY) {
        playSound('eat');
        score += 10;
        scoreElement.textContent = score;
        if (currentSpeed > 50) currentSpeed -= 2;
        placeFood();
        ateSomething = true;
    }

    // Growth logic
    if (ateSomething) {
        // If it was a boost, we already added 1 via 'ateSomething', subtract 1 from pending
        if (pendingGrowth > 0) pendingGrowth--; 
    } else if (pendingGrowth > 0) {
        // Grow without eating (processing boost growth)
        pendingGrowth--;
    } else {
        // Normal movement
        snake.pop();
    }
}

function placeFood() {
    let valid = false;
    while(!valid) {
        foodX = Math.floor(Math.random() * tileCount);
        foodY = Math.floor(Math.random() * tileCount);
        valid = !snake.some(s => s.x === foodX && s.y === foodY);
    }
}

function checkCollision() {
    const head = snake[0];
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount) gameOver();
    for (let i = 1; i < snake.length; i++) {
        if (head.x === snake[i].x && head.y === snake[i].y) gameOver();
    }
}

function gameOver() {
    if (isPlaying) playSound('die');
    isPlaying = false;
    clearTimeout(gameLoop);
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("snakeHighScore", highScore);
        highScoreElement.textContent = highScore;
        overlayTitle.textContent = "NEW RECORD!";
    } else {
        overlayTitle.textContent = "GAME OVER";
    }
    overlayText.textContent = `Final Score: ${score}`;
    startBtn.textContent = "PLAY AGAIN";
    overlay.classList.remove("hidden");
}

function changeDirection(key) {
    initAudio();
    if ((key === "ArrowLeft" || key === "a" || key === "A") && dx !== 1) { dx = -1; dy = 0; }
    if ((key === "ArrowUp" || key === "w" || key === "W") && dy !== 1) { dx = 0; dy = -1; }
    if ((key === "ArrowRight" || key === "d" || key === "D") && dx !== -1) { dx = 1; dy = 0; }
    if ((key === "ArrowDown" || key === "s" || key === "S") && dy !== -1) { dx = 0; dy = 1; }
}

document.addEventListener("keydown", (e) => {
    if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].indexOf(e.code) > -1) e.preventDefault();
    changeDirection(e.key);
});

document.getElementById("btn-up").onclick = () => changeDirection("ArrowUp");
document.getElementById("btn-down").onclick = () => changeDirection("ArrowDown");
document.getElementById("btn-left").onclick = () => changeDirection("ArrowLeft");
document.getElementById("btn-right").onclick = () => changeDirection("ArrowRight");

startBtn.addEventListener("click", initGame);
clearCanvas();