const $ = (id) => document.getElementById(id);

const intro = $("intro");
const game = $("game");
const result = $("result");
const pauseOverlay = $("pauseOverlay");
const arena = $("arena");

const scoreEl = $("score");
const timeEl = $("time");
const livesEl = $("lives");
const comboEl = $("combo");
const timeBar = $("timeBar");
const statusEl = $("status");
const arenaMessage = $("arenaMessage");

const ROUND_SECONDS = 45;
const TARGET_SCORE = 25;
const MAX_LIVES = 3;

let score = 0;
let lives = MAX_LIVES;
let secondsLeft = ROUND_SECONDS;
let combo = 0;

let running = false;
let paused = false;

let targetTimer = null;
let clockTimer = null;
let currentTarget = null;

let actionHistory = [];

let best = Number(localStorage.getItem("pulseBest") || 0);
$("best").textContent = best;

// Сохраняем последние 5 значимых действий
function addHistory(message) {
  actionHistory.unshift(message);
  actionHistory = actionHistory.slice(0, 5);
}

// Переключаем экраны
function showScreen(screen) { 
  intro.classList.toggle("hidden", screen !== "intro");
  game.classList.toggle("hidden", screen !== "game");
  result.classList.toggle("hidden", screen !== "result");
}

// Обновляем счёт, жизни и таймер на экране
function updateHUD() {
  scoreEl.textContent = score;
  timeEl.textContent = secondsLeft;

  livesEl.textContent =
    "♥".repeat(lives) + "♡".repeat(MAX_LIVES - lives);

  livesEl.setAttribute(
    "aria-label",
    `${lives} из ${MAX_LIVES} жизней`
  );

  comboEl.textContent = combo >= 3 ? "×2" : "×1";

  timeBar.style.width =
    `${Math.max(0, secondsLeft / ROUND_SECONDS * 100)}%`;

  timeBar.style.background =
    secondsLeft <= 10 ? "var(--red)" : "var(--cyan)";
}

// Начинаем новую игру
function startGame() {
  clearInterval(clockTimer);
  clearTimeout(targetTimer);

  score = 0;
  lives = MAX_LIVES;
  secondsLeft = ROUND_SECONDS;
  combo = 0;

  actionHistory = [];
  running = true;
  paused = false;
  currentTarget = null;

  arena.querySelectorAll(".target").forEach((el) => el.remove());

  arenaMessage.textContent = "";
  statusEl.textContent = "Нажимай на бирюзовые цели";

  pauseOverlay.classList.add("hidden");

  showScreen("game");
  updateHUD();

  spawnTarget();

  // Игровой таймер
  clockTimer = setInterval(() => {
    if (!running || paused) return;

    secondsLeft -= 1;
    updateHUD();

    if (secondsLeft <= 0) {
      endGame("time");
    }
  }, 1000);
}

// Создаём новую цель
function spawnTarget() {
  if (!running || paused) return;

  if (currentTarget) {
    currentTarget.remove();
  }

  const roll = Math.random();

  let type;

  if (roll < 0.12) {
    type = "bonus";
  } else if (roll < 0.27) {
    type = "danger";
  } else {
    type = "normal";
  }

  const target = document.createElement("button");

  target.className = `target ${type}`;
  target.type = "button";

  target.setAttribute(
    "aria-label",
    type === "normal"
      ? "Цель, одно очко"
      : type === "bonus"
      ? "Бонус, три очка"
      : "Опасная помеха"
  );

  const bounds = arena.getBoundingClientRect();

  const size = Math.min(
    72,
    Math.max(48, bounds.width * 0.14)
  );

  const maxX = Math.max(
    8,
    bounds.width - size - 12
  );

  const maxY = Math.max(
    45,
    bounds.height - size - 12
  );

  const x = 12 + Math.random() * (maxX - 12);
  const y = 42 + Math.random() * (maxY - 42);

  target.style.left = `${x}px`;
  target.style.top = `${y}px`;
  target.style.width = `${size}px`;
  target.style.height = `${size}px`;

  // Обработка попадания
  target.addEventListener("pointerdown", (event) => {
    event.preventDefault();

    if (!running || paused) return;

    // Игрок нажал на опасный объект
    if (type === "danger") {
      lives -= 1;
      combo = 0;

      addHistory("Нажал на помеху: −1 жизнь");

      statusEl.textContent =
        "Осторожно! Это была помеха";
    } else {
      // Игрок попал по обычной или бонусной цели
      const points = type === "bonus" ? 3 : 1;

      combo += 1;

const multiplier = combo >= 3 ? 2 : 1;

      score += points * multiplier;

      if (type === "bonus") {
        addHistory("Поймал бонус: +3 очка");
      } else {
        addHistory("Попал по цели: +1 очко");
      }

      statusEl.textContent =
        combo >= 3
          ? "Комбо активировано ×2!"
          : "Отлично! Продолжай";

      // Проверяем победу
      if (score >= TARGET_SCORE) {
        updateHUD();
        endGame("win");
        return;
      }
    }

    updateHUD();

    currentTarget = null;
    target.remove();

    clearTimeout(targetTimer);

    // Чем больше очков, тем быстрее появляются цели
    const delay = Math.max(
      430,
      1050 - score * 18
    );

    targetTimer = setTimeout(spawnTarget, delay);

    // Проверяем поражение
    if (lives <= 0) {
      endGame("lives");
    }
  });

  arena.appendChild(target);
  currentTarget = target;

  // Время, в течение которого цель остаётся на поле
  const lifespan = Math.max(
    900,
    1900 - score * 22
  );

  targetTimer = setTimeout(() => {
    if (!running || paused) return;

    if (currentTarget === target) {
      target.remove();
      currentTarget = null;

      lives -= 1;
      combo = 0;

      addHistory("Пропустил цель: −1 жизнь");

      statusEl.textContent =
        "Цель исчезла — будь быстрее!";

      updateHUD();

      if (lives <= 0) {
        endGame("lives");
      } else {
        spawnTarget();
      }
    }
  }, lifespan);
}

// Завершаем игру
function endGame(reason) {
  if (!running) return;

  running = false;
  paused = false;

  clearInterval(clockTimer);
  clearTimeout(targetTimer);

  if (currentTarget) {
    currentTarget.remove();
  }

  currentTarget = null;

  const won = reason === "win";

  $("resultEyebrow").textContent =
    won ? "ЦЕЛЬ ДОСТИГНУТА" : "РАУНД ЗАВЕРШЁН";

  if (won) {
    $("resultTitle").textContent = "Отличный импульс!";
  } else if (reason === "lives") {
    $("resultTitle").textContent = "Попробуй ещё!";
  } else {
    $("resultTitle").textContent = "Время вышло";
  }

  $("finalScore").textContent = score;

  // Сохраняем рекорд
  if (score > best) {
    best = score;

    localStorage.setItem("pulseBest", String(best));

    $("best").textContent = best;
    $("resultText").textContent =
      "Новый рекорд! Так держать.";
  } else {
    $("resultText").textContent =
      won
        ? "Ты поймал все импульсы!"
        : `До цели осталось ${Math.max(
            0,
            TARGET_SCORE - score
          )} очков.`;
  }

  // Показываем историю действий
  const history = $("history");

  history.innerHTML = "";

  actionHistory.forEach((item) => {
    const li = document.createElement("li");

    li.textContent = item;

    history.appendChild(li);
  });

  $("historyWrap").classList.toggle(
    "hidden",
    actionHistory.length === 0
  );

  showScreen("result");
}

// Пауза
function togglePause() {
  if (!running) return;

  paused = !paused;

  pauseOverlay.classList.toggle(
    "hidden",
    !paused
  );

  $("pauseBtn").textContent =
    paused ? "▶" : "Ⅱ";

  if (paused) {
    clearTimeout(targetTimer);

    statusEl.textContent = "Игра на паузе";
  } else {
    statusEl.textContent =
      "Продолжай ловить цели";

    if (!currentTarget) {
      spawnTarget();
    } else {
      // Возвращаем цель после паузы
      targetTimer = setTimeout(() => {
        if (
          running &&
          !paused &&
          currentTarget
        ) {
          currentTarget.remove();
          currentTarget = null;

          lives -= 1;
          combo = 0;

          addHistory("Пропустил цель: −1 жизнь");

          updateHUD();

          if (lives <= 0) {
            endGame("lives");
          } else {
            spawnTarget();
          }
        }
      }, 1500);
    }
  }
}

// Кнопки интерфейса
$("startBtn").addEventListener(
  "click",
  startGame
);

$("againBtn").addEventListener(
  "click",
  startGame
);

$("pauseRestartBtn").addEventListener(

"click",
  startGame
);

$("pauseBtn").addEventListener(
  "click",
  togglePause
);

$("resumeBtn").addEventListener(
  "click",
  togglePause
);

// Возвращение на главный экран
$("homeBtn").addEventListener("click", () => {
  clearInterval(clockTimer);
  clearTimeout(targetTimer);

  running = false;
  paused = false;

  pauseOverlay.classList.add("hidden");

  showScreen("intro");
});

// Управление клавиатурой
document.addEventListener("keydown", (event) => {
  if (event.code === "Escape" && running) {
    togglePause();
  }

  if (
    event.code === "Space" &&
    running &&
    !paused
  ) {
    event.preventDefault();

    if (currentTarget) {
      // Пробел активирует цель так же, как касание
      currentTarget.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          cancelable: true
        })
      );
    }
  }
});