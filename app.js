let words = [];
let wordsByDifficulty = {
  all: [],
  medium: [],
  hard: []
};
let remainingWords = [];
let practiceWords = [];
let currentWord = "";
let currentIndex = 0;
let score = 0;
let attempts = 0;
let answered = false;
let isPaused = false;
let autoAdvanceTimer = null;
let countdownInterval = null;
let remainingSeconds = 0;

const scoreEl = document.getElementById("score");
const totalEl = document.getElementById("total");
const progressText = document.getElementById("progressText");
const accuracyText = document.getElementById("accuracyText");
const progressFill = document.getElementById("progressFill");
const answerInput = document.getElementById("answerInput");
const feedback = document.getElementById("feedback");
const historyList = document.getElementById("historyList");
const statusIcon = document.getElementById("statusIcon");
const difficultySelect = document.getElementById("difficultySelect");
const batchSelect = document.getElementById("batchSelect");
const timerSelect = document.getElementById("timerSelect");
const timerDisplay = document.getElementById("timerDisplay");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
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
    setWordData(data);
    updateTotal();
  } catch {
    setWordData([]);
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

  return [...new Set(
    result
      .map(word => String(word).trim())
      .filter(Boolean)
  )];
}

function setWordData(data) {
  const mediumWords = Array.isArray(data?.medium) ? cleanWords(data.medium) : [];
  const hardWords = data?.hard ? cleanWords(data.hard) : [];
  const fallbackWords = Array.isArray(data) ? cleanWords(data) : [];

  wordsByDifficulty = {
    medium: mediumWords.length > 0 ? mediumWords : fallbackWords,
    hard: hardWords,
    all: cleanWords(data)
  };

  if (wordsByDifficulty.all.length === 0) {
    wordsByDifficulty.all = [...new Set([...wordsByDifficulty.medium, ...wordsByDifficulty.hard])];
  }

  words = wordsByDifficulty.all;
  resetWordPool();
}

function shuffle(array) {
  return array.sort(() => Math.random() - 0.5);
}

function getSelectedDifficulty() {
  return difficultySelect.value || "all";
}

function getAvailableWords() {
  const selected = getSelectedDifficulty();
  return wordsByDifficulty[selected] || wordsByDifficulty.all;
}

function resetWordPool() {
  remainingWords = [];
  practiceWords = [];
  currentWord = "";
  currentIndex = 0;
  score = 0;
  attempts = 0;
  answered = false;
  isPaused = false;
  remainingSeconds = 0;
  answerInput.value = "";
  answerInput.disabled = false;
  clearAutoAdvance();
  clearCountdown();
  updatePauseButton();
  updateTimerDisplay(getSelectedSeconds());
  updateProgress();
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
  const availableWords = getAvailableWords();

  if (availableWords.length === 0) {
    showFeedback(`No ${getSelectedDifficulty()} words are available right now.`, "wrong");
    return;
  }

  if (remainingWords.length === 0) {
    remainingWords = shuffle([...availableWords]);
  }

  const batchSize = Math.min(getSelectedBatchSize(), remainingWords.length);
  practiceWords = remainingWords.slice(0, batchSize);
  remainingWords = remainingWords.slice(batchSize);

  restartPractice(
    `Starting a ${practiceWords.length}-word ${getSelectedDifficulty()} batch. ${remainingWords.length} words left after this batch.`
  );
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
  isPaused = false;
  remainingSeconds = 0;

  historyList.innerHTML = `<p class="empty">No attempts yet.</p>`;
  updateScore();
  updatePauseButton();
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
      ? `Batch completed. ${remainingWords.length} ${getSelectedDifficulty()} words remaining in the pool`
      : `Batch completed. All ${getSelectedDifficulty()} words have been used`;
    updateTimerDisplay(0);
    showFeedback(`Finished this batch! Score: ${score}/${practiceWords.length}`, "correct");
    updateProgress();
    return;
  }

  currentWord = practiceWords[currentIndex];
  answered = false;
  isPaused = false;
  remainingSeconds = 0;

  answerInput.value = "";
  answerInput.disabled = false;
  answerInput.focus();
  feedback.textContent = "";
  feedback.className = "feedback";
  statusIcon.textContent = "🎧";

  progressText.textContent = `Word ${currentIndex + 1} of ${practiceWords.length} | ${remainingWords.length} ${getSelectedDifficulty()} words still unused`;
  updateProgress();
  updatePauseButton();
  startCountdown();

  setTimeout(speakWord, 300);
}

function startCountdown() {
  const seconds = remainingSeconds || getSelectedSeconds();
  updateTimerDisplay(seconds);

  countdownInterval = setInterval(() => {
    const nextRemaining = Math.max(0, remainingSeconds || seconds);
    remainingSeconds = nextRemaining > 0 ? nextRemaining - 0.1 : 0;
    updateTimerDisplay(remainingSeconds);

    if (remainingSeconds <= 0) {
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

function togglePause() {
  if (!currentWord || answered) {
    showFeedback("Start a word first to use pause.", "wrong");
    return;
  }

  if (isPaused) {
    isPaused = false;
    answerInput.disabled = false;
    answerInput.focus();
    statusIcon.textContent = "🎧";
    updatePauseButton();
    showFeedback("Practice resumed.", "correct");
    startCountdown();
    return;
  }

  isPaused = true;
  clearCountdown();
  clearAutoAdvance();
  answerInput.disabled = true;
  statusIcon.textContent = "⏸️";
  updatePauseButton();
  updateTimerDisplay(remainingSeconds || getSelectedSeconds());
  showFeedback("Practice paused.", "correct");
}

function updatePauseButton() {
  pauseBtn.textContent = isPaused ? "Resume" : "Pause";
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
  isPaused = false;
  remainingSeconds = 0;
  clearCountdown();
  updatePauseButton();
  answerInput.disabled = false;

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
    isPaused = false;
    answerInput.disabled = false;
    updatePauseButton();
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
  totalEl.textContent = practiceWords.length || getAvailableWords().length;

  const accuracy = attempts === 0 ? 0 : Math.round((score / attempts) * 100);
  accuracyText.textContent = `Accuracy: ${accuracy}%`;
}

function updateTotal() {
  totalEl.textContent = practiceWords.length || getAvailableWords().length;
  progressText.textContent = `${getAvailableWords().length} ${getSelectedDifficulty()} words loaded`;
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
      setWordData(data);
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

  setWordData(
    text
      .split(/[\n,]+/)
      .map(word => word.trim())
      .filter(Boolean)
  );

  updateTotal();
  showFeedback(`${words.length} pasted words loaded.`, "correct");
});

answerInput.addEventListener("input", () => {
  if (!currentWord || answered || isPaused) return;

  if (normalize(answerInput.value) === normalize(currentWord)) {
    checkAnswer();
  }
});

difficultySelect.addEventListener("change", () => {
  resetWordPool();
  updateTotal();
  showFeedback(`Difficulty changed to ${getSelectedDifficulty()}.`, "correct");
});

timerSelect.addEventListener("change", () => {
  updateTimerDisplay(getSelectedSeconds());

  if (currentWord && !answered) {
    clearCountdown();
    remainingSeconds = getSelectedSeconds();
    startCountdown();
  }
});

document.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    event.preventDefault();
    if (isPaused) return;
    checkAnswer();
  }

  if (event.ctrlKey && event.key.toLowerCase() === "r") {
    event.preventDefault();
    speakWord();
  }
});

startBtn.addEventListener("click", startPractice);
pauseBtn.addEventListener("click", togglePause);
resetBtn.addEventListener("click", () => restartPractice());
repeatBtn.addEventListener("click", speakWord);
submitBtn.addEventListener("click", () => checkAnswer());

updatePauseButton();
updateTimerDisplay(getSelectedSeconds());
loadDefaultWords();
