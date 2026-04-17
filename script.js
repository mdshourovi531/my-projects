const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("current-score");
const highScoreElement = document.getElementById("high-score");
const overlay = document.getElementById("overlay");
const startBtn = document.getElementById("start-btn");
const instModal = document.getElementById("inst-modal");

const gridSize = 20;
const tileCount = canvas.width / gridSize;

let snake = [], dx = 0, dy = -1, foodX, foodY, score = 0;
let isPlaying = false, pendingGrowth = 0;
let highScore = localStorage.getItem("snakeHighScore") || 0;

// --- Special Item Variables ---
let specialItem = null; 
let nextSpawnTime = 0;

highScoreElement.textContent = highScore;

// Swipe Logic Variables
let touchStartX = 0;
let touchStartY = 0;

function initGame() {
    snake = [{x: 10, y: 10}, {x: 10, y: 11}, {x: 10, y: 12}];
    dx = 0; dy = -1; score = 0; pendingGrowth = 0;
    specialItem = null;
    setNextSpawnTime();
    scoreElement.textContent = score;
    placeFood();
    overlay.classList.add("hidden");
    isPlaying = true;
    gameLoop();
}

function setNextSpawnTime() {
    // ৫ থেকে ৭ সেকেন্ড পর স্পন হবে
    nextSpawnTime = Date.now() + (Math.random() * 2000 + 5000);
}

function spawnSpecialItem() {
    const type = Math.random() > 0.5 ? 'boost' : 'boom';
    let x, y;
    do {
        x = Math.floor(Math.random() * tileCount);
        y = Math.floor(Math.random() * tileCount);
    } while (snake.some(s => s.x === x && s.y === y) || (x === foodX && y === foodY));

    specialItem = { x, y, type, expiresAt: Date.now() + 3000 }; // ৩ সেকেন্ড থাকবে
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

function drawSpecialItem() {
    if (!specialItem) return;
    const { x, y, type } = specialItem;
    
    ctx.shadowBlur = 15;
    ctx.fillStyle = (type === 'boost') ? "#00ffff" : "#ffaa00";
    ctx.shadowColor = ctx.fillStyle;
    
    // ক্যাপসুল শেপ ড্রয়িং
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

    // Special Item Collision
    if (specialItem && head.x === specialItem.x && head.y === specialItem.y) {
        if (specialItem.type === 'boost') {
            score += 50;
            pendingGrowth += 2; // ২ ব্লক বাড়বে
        } else {
            score = Math.max(0, score - 70);
        }
        specialItem = null;
        setNextSpawnTime();
        ateSomething = true;
    }

    // Food Collision
    if (head.x === foodX && head.y === foodY) {
        score += 10;
        placeFood();
        ateSomething = true;
    }

    if (ateSomething) {
        if (pendingGrowth > 0) pendingGrowth--;
    } else if (pendingGrowth > 0) {
        pendingGrowth--;
    } else {
        snake.pop();
    }

    // Death Check
    if (head.x < 0 || head.x >= tileCount || head.y < 0 || head.y >= tileCount || 
        snake.slice(1).some(s => s.x === head.x && s.y === head.y)) {
        gameOver();
    }
    scoreElement.textContent = score;
}

function drawSnake() {
    snake.forEach((segment, index) => {
        if (index === 0) {
            ctx.fillStyle = "#2ecc71";
            ctx.beginPath();
            ctx.roundRect(segment.x * gridSize, segment.y * gridSize, gridSize, gridSize, 8);
            ctx.fill();
            ctx.fillStyle = "white"; // চোখ
            ctx.fillRect(segment.x * gridSize + 4, segment.y * gridSize + 4, 3, 3);
            ctx.fillRect(segment.x * gridSize + 12, segment.y * gridSize + 4, 3, 3);
        } else {
            ctx.fillStyle = index % 2 === 0 ? "#27ae60" : "#2ecc71";
            ctx.beginPath();
            ctx.roundRect(segment.x * gridSize + 1, segment.y * gridSize + 1, gridSize - 2, gridSize - 2, 5);
            ctx.fill();
        }
    });
}

function gameLoop() {
    if (!isPlaying) return;
    updateSpecialItems();
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    moveSnake();
    
    // Draw Food
    ctx.fillStyle = "#ff0055";
    ctx.beginPath();
    ctx.arc(foodX * gridSize + 10, foodY * gridSize + 10, 8, 0, Math.PI*2);
    ctx.fill();

    drawSpecialItem();
    drawSnake();
    
    setTimeout(gameLoop, 120);
}

function gameOver() {
    isPlaying = false;
    if (score > highScore) {
        highScore = score;
        localStorage.setItem("snakeHighScore", highScore);
        highScoreElement.textContent = highScore;
    }
    overlay.classList.remove("hidden");
    document.getElementById("overlay-title").textContent = "GAME OVER";
}

function placeFood() {
    foodX = Math.floor(Math.random() * tileCount);
    foodY = Math.floor(Math.random() * tileCount);
}

// Swipe Controls
canvas.addEventListener('touchstart', e => {
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
}, false);

canvas.addEventListener('touchend', e => {
    let xDiff = e.changedTouches[0].screenX - touchStartX;
    let yDiff = e.changedTouches[0].screenY - touchStartY;
    if (Math.abs(xDiff) > Math.abs(yDiff)) {
        if (xDiff > 30 && dx === 0) { dx = 1; dy = 0; }
        else if (xDiff < -30 && dx === 0) { dx = -1; dy = 0; }
    } else {
        if (yDiff > 30 && dy === 0) { dx = 0; dy = 1; }
        else if (yDiff < -30 && dy === 0) { dx = 0; dy = -1; }
    }
}, false);

document.addEventListener("keydown", e => {
    if (e.key === "ArrowUp" && dy === 0) { dx = 0; dy = -1; }
    if (e.key === "ArrowDown" && dy === 0) { dx = 0; dy = 1; }
    if (e.key === "ArrowLeft" && dx === 0) { dx = -1; dy = 0; }
    if (e.key === "ArrowRight" && dx === 0) { dx = 1; dy = 0; }
});

startBtn.onclick = initGame;
document.getElementById("info-btn").onclick = () => instModal.classList.remove("hidden");
document.getElementById("close-inst").onclick = () => instModal.classList.add("hidden");