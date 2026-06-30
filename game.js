const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const scoreEl = document.getElementById("score");
const bestScoreEl = document.getElementById("bestScore");
const speedLabelEl = document.getElementById("speedLabel");
const overlay = document.getElementById("overlay");
const overlayTitle = document.getElementById("overlayTitle");
const overlayText = document.getElementById("overlayText");
const primaryAction = document.getElementById("primaryAction");
const pauseButton = document.getElementById("pauseButton");
const restartButton = document.getElementById("restartButton");
const speedSelect = document.getElementById("speedSelect");

const text = {
  readyTitle: "\u51c6\u5907\u5f00\u59cb",
  readyBody: "\u6309\u7a7a\u683c\u6216\u70b9\u51fb\u5f00\u59cb\u3002\u4f7f\u7528\u65b9\u5411\u952e / WASD \u63a7\u5236\u79fb\u52a8\u3002",
  start: "\u5f00\u59cb\u6e38\u620f",
  pause: "\u6682\u505c",
  resume: "\u7ee7\u7eed",
  pausedTitle: "\u5df2\u6682\u505c",
  pausedBody: "\u6309\u7a7a\u683c\u6216\u70b9\u51fb\u7ee7\u7eed\u3002",
  resumeGame: "\u7ee7\u7eed\u6e38\u620f",
  gameOver: "\u6e38\u620f\u7ed3\u675f",
  finalScore: "\u6700\u7ec8\u5f97\u5206",
  restartHint: "\u70b9\u51fb\u91cd\u5f00\u518d\u6765\u4e00\u5c40\u3002",
  restart: "\u91cd\u65b0\u5f00\u59cb",
};

const gridSize = 24;
const tileCount = canvas.width / gridSize;
const startSnake = [
  { x: 11, y: 12 },
  { x: 10, y: 12 },
  { x: 9, y: 12 },
];

const speedMap = {
  slow: { label: "\u8f7b\u677e", delay: 150 },
  normal: { label: "\u666e\u901a", delay: 105 },
  fast: { label: "\u5feb\u901f", delay: 72 },
};

let snake;
let food;
let direction;
let queuedDirection;
let score;
let bestScore = loadBestScore();
let gameState = "ready";
let lastStep = 0;
let animationFrame = 0;

function resetGame() {
  snake = startSnake.map((segment) => ({ ...segment }));
  direction = { x: 1, y: 0 };
  queuedDirection = { x: 1, y: 0 };
  score = 0;
  food = createFood();
  gameState = "ready";
  lastStep = 0;
  updateHud();
  showOverlay(text.readyTitle, text.readyBody, text.start);
  draw();
}

function startGame() {
  if (gameState === "running") {
    return;
  }

  if (gameState === "gameover") {
    snake = startSnake.map((segment) => ({ ...segment }));
    direction = { x: 1, y: 0 };
    queuedDirection = { x: 1, y: 0 };
    score = 0;
    food = createFood();
    updateHud();
  }

  gameState = "running";
  lastStep = performance.now();
  overlay.classList.add("hidden");
  pauseButton.textContent = text.pause;
  cancelAnimationFrame(animationFrame);
  animationFrame = requestAnimationFrame(loop);
}

function togglePause() {
  if (gameState === "ready" || gameState === "gameover") {
    startGame();
    return;
  }

  if (gameState === "paused") {
    startGame();
    return;
  }

  gameState = "paused";
  pauseButton.textContent = text.resume;
  showOverlay(text.pausedTitle, text.pausedBody, text.resumeGame);
}

function loop(timestamp) {
  if (gameState !== "running") {
    return;
  }

  const speed = speedMap[speedSelect.value].delay;
  if (timestamp - lastStep >= speed) {
    step();
    lastStep = timestamp;
  }

  draw();
  animationFrame = requestAnimationFrame(loop);
}

function step() {
  direction = queuedDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };
  const willEat = head.x === food.x && head.y === food.y;

  if (isWallCollision(head) || isSnakeCollision(head, willEat)) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (willEat) {
    score += 10;
    bestScore = Math.max(bestScore, score);
    saveBestScore(bestScore);
    food = createFood();
    updateHud();
  } else {
    snake.pop();
  }
}

function endGame() {
  gameState = "gameover";
  pauseButton.textContent = text.pause;
  showOverlay(text.gameOver, `${text.finalScore} ${score}\u3002${text.restartHint}`, text.restart);
}

function createFood() {
  let nextFood;
  do {
    nextFood = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
  } while (snake.some((segment) => segment.x === nextFood.x && segment.y === nextFood.y));

  return nextFood;
}

function isWallCollision(position) {
  return position.x < 0 || position.x >= tileCount || position.y < 0 || position.y >= tileCount;
}

function isSnakeCollision(position, willEat) {
  return snake.some((segment, index) => {
    const isTail = index === snake.length - 1;
    return (willEat || !isTail) && segment.x === position.x && segment.y === position.y;
  });
}

function setDirection(next) {
  if (gameState !== "running" && gameState !== "ready") {
    return;
  }

  const reversing = next.x + direction.x === 0 && next.y + direction.y === 0;
  if (!reversing) {
    queuedDirection = next;
  }
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBoard();
  drawFood();
  drawSnake();
}

function drawBoard() {
  ctx.fillStyle = "#172018";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < tileCount; y += 1) {
    for (let x = 0; x < tileCount; x += 1) {
      if ((x + y) % 2 === 0) {
        ctx.fillStyle = "#1a241b";
        ctx.fillRect(x * gridSize, y * gridSize, gridSize, gridSize);
      }
    }
  }

  ctx.strokeStyle = "rgba(237, 244, 235, 0.08)";
  ctx.lineWidth = 1;
  for (let i = 0; i <= tileCount; i += 1) {
    const pos = i * gridSize;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(canvas.width, pos);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const x = segment.x * gridSize;
    const y = segment.y * gridSize;
    const inset = index === 0 ? 2 : 3;
    const size = gridSize - inset * 2;

    ctx.fillStyle = index === 0 ? "#b8ff7a" : "#80d85d";
    roundedRect(x + inset, y + inset, size, size, 7);
    ctx.fill();

    if (index === 0) {
      drawEyes(x, y);
    }
  });
}

function drawEyes(x, y) {
  ctx.fillStyle = "#101510";
  const eyeOffsetX = direction.x === 1 ? 15 : direction.x === -1 ? 7 : 8;
  const eyeOffsetY = direction.y === 1 ? 15 : direction.y === -1 ? 7 : 8;
  const secondEyeOffsetX = direction.y !== 0 ? 15 : eyeOffsetX;
  const secondEyeOffsetY = direction.x !== 0 ? 15 : eyeOffsetY;

  ctx.beginPath();
  ctx.arc(x + eyeOffsetX, y + eyeOffsetY, 2.8, 0, Math.PI * 2);
  ctx.arc(x + secondEyeOffsetX, y + secondEyeOffsetY, 2.8, 0, Math.PI * 2);
  ctx.fill();
}

function drawFood() {
  const centerX = food.x * gridSize + gridSize / 2;
  const centerY = food.y * gridSize + gridSize / 2;

  ctx.fillStyle = "#ffd166";
  ctx.beginPath();
  ctx.arc(centerX, centerY, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ef476f";
  ctx.beginPath();
  ctx.arc(centerX - 3, centerY - 3, 3, 0, Math.PI * 2);
  ctx.fill();
}

function roundedRect(x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function updateHud() {
  scoreEl.textContent = String(score);
  bestScoreEl.textContent = String(bestScore);
  speedLabelEl.textContent = speedMap[speedSelect.value].label;
}

function showOverlay(title, body, buttonText) {
  overlayTitle.textContent = title;
  overlayText.textContent = body;
  primaryAction.textContent = buttonText;
  overlay.classList.remove("hidden");
}

function loadBestScore() {
  try {
    return Number(localStorage.getItem("snakeBestScore") || 0);
  } catch {
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem("snakeBestScore", String(value));
  } catch {
    // Highest score persistence is optional; gameplay should continue if storage is unavailable.
  }
}

function directionFromKey(key) {
  const normalizedKey = key.toLowerCase();
  const directions = {
    arrowup: { x: 0, y: -1 },
    w: { x: 0, y: -1 },
    arrowdown: { x: 0, y: 1 },
    s: { x: 0, y: 1 },
    arrowleft: { x: -1, y: 0 },
    a: { x: -1, y: 0 },
    arrowright: { x: 1, y: 0 },
    d: { x: 1, y: 0 },
  };

  return directions[normalizedKey];
}

document.addEventListener("keydown", (event) => {
  const nextDirection = directionFromKey(event.key);
  if (nextDirection) {
    event.preventDefault();
    setDirection(nextDirection);
    if (gameState === "ready") {
      startGame();
    }
    return;
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePause();
  }
});

primaryAction.addEventListener("click", startGame);
pauseButton.addEventListener("click", togglePause);
restartButton.addEventListener("click", () => {
  resetGame();
  startGame();
});

speedSelect.addEventListener("change", () => {
  updateHud();
});

document.querySelectorAll("[data-direction]").forEach((button) => {
  button.addEventListener("click", () => {
    const directions = {
      up: { x: 0, y: -1 },
      down: { x: 0, y: 1 },
      left: { x: -1, y: 0 },
      right: { x: 1, y: 0 },
    };
    setDirection(directions[button.dataset.direction]);
    if (gameState === "ready") {
      startGame();
    }
  });
});

resetGame();
