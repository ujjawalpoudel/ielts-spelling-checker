let words = [];
let remainingWords = [];
let practiceWords = [];
let currentWord = "";
let currentIndex = 0;
let score = 0;
let attempts = 0;
let answered = false;
let autoAdvanceTimer = null;
let countdownInterval = null;
let countdownEndsAt = 0;

const scoreEl = document.getElementById("score");
const totalEl = document.getElementById("total");
const progressText = document.getElementById("progressText");
const accuracyText = document.getElementById("accuracyText");
const progressFill = document.getElementById("progressFill");
const answerInput = document.getElementById("answerInput");
const feedback = document.getElementById("feedback");
const historyList = document.getElementById("historyList");
const statusIcon = document.getElementById("statusIcon");
const batchSelect = document.getElementById("batchSelect");
const timerSelect = document.getElementById("timerSelect");
const timerDisplay = document.getElementById("timerDisplay");

const startBtn = document.getElementById("startBtn");
const resetBtn = document.getElementById("resetBtn");
const repeatBtn = document.getElementById("repeatBtn");
const submitBtn = document.getElementById("submitBtn");
const fileInput = document.getElementById("fileInput");
const pasteInput = document.getElementById("pasteInput");
const loadPasteBtn = document.getElementById("loadPasteBtn");

async function loadDefaultWords() {
  try {
    const response = await fetch("words.json");
    const data = await response.json();
    words = cleanWords(data);
    resetWordPool();
    updateTotal();
  } catch {
    words = [];
    resetWordPool();
    showFeedback("Could not load words.json", "wrong");
  }
}

function cleanWords(data) {
  let result = [];

  if (Array.isArray(data)) {
    result = data;
  } else if (typeof data === "object" && data !== null) {
    Object.values(data).forEach(value => {
      if (Array.isArray(value)) {
        result.push(...value);
      } else if (typeof value === "object" && value !== null) {
        Object.values(value).forEach(inner => {
          if (Array.isArray(inner)) {
            result.push(...inner);
          }
        });
      }
    });
  }

  result = result
    .map(word => String(word).trim())
    .filter(Boolean);

  return [...new Set(result)];
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function resetWordPool() {
  remainingWords = [];
  practiceWords = [];
  currentWord = "";
  currentIndex = 0;
  score = 0;
  attempts = 0;
  answered = false;
  clearAutoAdvance();
  clearCountdown();
  updateTimerDisplay(getSelectedSeconds());
}

function getSelectedSeconds() {
  return Number(timerSelect.value) || 5;
}

function getSelectedBatchSize() {
  return Number(batchSelect.value) || 10;
}

function updateTimerDisplay(seconds) {
  timerDisplay.textContent = `${seconds.toFixed(1)}s`;
}

function startPractice() {
  if (words.length === 0) {
    showFeedback("Please load some words first.", "wrong");
    return;
  }

  if (remainingWords.length === 0) {
    remainingWords = shuffle([...words]);
  }

  const batchSize = Math.min(getSelectedBatchSize(), remainingWords.length);
  practiceWords = remainingWords.slice(0, batchSize);
  remainingWords = remainingWords.slice(batchSize);

  restartPractice(`Starting a ${practiceWords.length}-word batch. ${remainingWords.length} words left after this batch.`);
}

function restartPractice(message = "Practice reset. Starting again from word 1.") {
  if (practiceWords.length === 0) {
    showFeedback("Start a batch first.", "wrong");
    return;
  }

  clearAutoAdvance();
  clearCountdown();
  currentIndex = 0;
  score = 0;
  attempts = 0;
  answered = false;

  historyList.innerHTML = `<p class="empty">No attempts yet.</p>`;
  updateScore();
  loadQuestion();
  showFeedback(message, "correct");
}

function loadQuestion() {
  clearAutoAdvance();
  clearCountdown();

  if (currentIndex >= practiceWords.length) {
    currentWord = "";
    statusIcon.textContent = "🏆";
    progressText.textContent = remainingWords.length > 0
      ? `Batch completed. ${remainingWords.length} words remaining in the pool`
      : "Batch completed. All loaded words have been used";
    updateTimerDisplay(0);
    showFeedback(`Finished this batch! Score: ${score}/${practiceWords.length}`, "correct");
    updateProgress();
    return;
  }

  currentWord = practiceWords[currentIndex];
  answered = false;

  answerInput.value = "";
  answerInput.focus();
  feedback.textContent = "";
  feedback.className = "feedback";
  statusIcon.textContent = "🎧";

  progressText.textContent = `Word ${currentIndex + 1} of ${practiceWords.length} | ${remainingWords.length} words still unused`;
  updateProgress();
  startCountdown();

  setTimeout(speakWord, 300);
}

function startCountdown() {
  const seconds = getSelectedSeconds();
  countdownEndsAt = Date.now() + seconds * 1000;
  updateTimerDisplay(seconds);

  countdownInterval = setInterval(() => {
    const remaining = Math.max(0, (countdownEndsAt - Date.now()) / 1000);
    updateTimerDisplay(remaining);

    if (remaining <= 0) {
      clearCountdown();
      checkAnswer(true);
    }
  }, 100);
}

function clearCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

function speakWord() {
  if (!currentWord) return;

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(currentWord);
  speech.lang = "en-US";
  speech.rate = 0.75;
  speech.pitch = 1;

  window.speechSynthesis.speak(speech);
}

function normalize(text) {
  return text.trim().toLowerCase();
}

function checkAnswer(fromTimer = false) {
  if (!currentWord || answered) return;

  const userAnswer = answerInput.value.trim();

  if (!userAnswer && !fromTimer) {
    showFeedback("Please type your answer first.", "wrong");
    return;
  }

  answered = true;
  attempts++;
  clearCountdown();

  const isCorrect = normalize(userAnswer) === normalize(currentWord);

  if (isCorrect) {
    score++;
    statusIcon.textContent = "✅";
    showFeedback("Correct!", "correct");
  } else if (!userAnswer) {
    statusIcon.textContent = "⏰";
    showFeedback(`Time is up! Correct spelling: ${currentWord}`, "wrong");
  } else {
    statusIcon.textContent = "❌";
    showFeedback(`Wrong! Correct spelling: ${currentWord}`, "wrong");
  }

  addHistory(userAnswer || "(no answer)", currentWord, isCorrect);
  updateScore();
  updateProgress();
  scheduleNextQuestion();
}

function nextQuestion() {
  if (!currentWord) return;

  if (!answered) {
    checkAnswer(true);
    return;
  }

  currentIndex++;
  loadQuestion();
}

function scheduleNextQuestion() {
  clearAutoAdvance();
  autoAdvanceTimer = setTimeout(() => {
    currentIndex++;
    loadQuestion();
  }, 900);
}

function clearAutoAdvance() {
  if (autoAdvanceTimer) {
    clearTimeout(autoAdvanceTimer);
    autoAdvanceTimer = null;
  }
}

function updateScore() {
  scoreEl.textContent = score;
  totalEl.textContent = practiceWords.length || words.length;

  const accuracy = attempts === 0 ? 0 : Math.round((score / attempts) * 100);
  accuracyText.textContent = `Accuracy: ${accuracy}%`;
}

function updateTotal() {
  totalEl.textContent = practiceWords.length || words.length;
  progressText.textContent = `${words.length} words loaded`;
  updateProgress();
}

function updateProgress() {
  const percentage = practiceWords.length === 0
    ? 0
    : Math.round((currentIndex / practiceWords.length) * 100);

  progressFill.style.width = `${percentage}%`;
}

function showFeedback(message, type) {
  feedback.textContent = message;
  feedback.className = `feedback ${type}`;
}

function addHistory(userAnswer, correctWord, isCorrect) {
  const empty = historyList.querySelector(".empty");
  if (empty) empty.remove();

  const item = document.createElement("div");
  item.className = "history-item";

  item.innerHTML = `
    <div>
      ${isCorrect ? "✅" : "❌"} Your answer: ${userAnswer}
    </div>
    <span>Correct: ${correctWord}</span>
  `;

  historyList.prepend(item);
}

fileInput.addEventListener("change", event => {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      words = cleanWords(data);
      resetWordPool();
      updateTotal();
      showFeedback(`${words.length} words loaded from JSON file.`, "correct");
    } catch {
      showFeedback("Invalid JSON file.", "wrong");
    }
  };

  reader.readAsText(file);
});

loadPasteBtn.addEventListener("click", () => {
  const text = pasteInput.value.trim();

  if (!text) {
    showFeedback("Please paste some words first.", "wrong");
    return;
  }

  words = text
    .split(/[\n,]+/)
    .map(word => word.trim())
    .filter(Boolean);

  words = [...new Set(words)];
  resetWordPool();

  updateTotal();
  showFeedback(`${words.length} pasted words loaded.`, "correct");
});

answerInput.addEventListener("input", () => {
  if (!currentWord || answered) return;

  if (normalize(answerInput.value) === normalize(currentWord)) {
    checkAnswer();
  }
});

timerSelect.addEventListener("change", () => {
  updateTimerDisplay(getSelectedSeconds());

  if (currentWord && !answered) {
    clearCountdown();
    startCountdown();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    checkAnswer();
  }

  if (event.ctrlKey && event.key.toLowerCase() === "r") {
    event.preventDefault();
    speakWord();
  }
});

startBtn.addEventListener("click", startPractice);
resetBtn.addEventListener("click", () => restartPractice());
repeatBtn.addEventListener("click", speakWord);
submitBtn.addEventListener("click", () => checkAnswer());

updateTimerDisplay(getSelectedSeconds());
loadDefaultWords();
