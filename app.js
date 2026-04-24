let words = [];
let currentWord = "";
let currentIndex = 0;
let score = 0;
let attempts = 0;
let answered = false;

const scoreEl = document.getElementById("score");
const totalEl = document.getElementById("total");
const progressText = document.getElementById("progressText");
const accuracyText = document.getElementById("accuracyText");
const progressFill = document.getElementById("progressFill");
const answerInput = document.getElementById("answerInput");
const feedback = document.getElementById("feedback");
const historyList = document.getElementById("historyList");
const statusIcon = document.getElementById("statusIcon");

const startBtn = document.getElementById("startBtn");
const repeatBtn = document.getElementById("repeatBtn");
const submitBtn = document.getElementById("submitBtn");
const nextBtn = document.getElementById("nextBtn");
const fileInput = document.getElementById("fileInput");
const pasteInput = document.getElementById("pasteInput");
const loadPasteBtn = document.getElementById("loadPasteBtn");

async function loadDefaultWords() {
  try {
    const response = await fetch("words.json");
    const data = await response.json();
    words = cleanWords(data);
    updateTotal();
  } catch {
    words = [];
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

function startPractice() {
  if (words.length === 0) {
    showFeedback("Please load some words first.", "wrong");
    return;
  }

  words = shuffle([...words]);
  currentIndex = 0;
  score = 0;
  attempts = 0;
  answered = false;

  historyList.innerHTML = `<p class="empty">No attempts yet.</p>`;
  updateScore();
  loadQuestion();
}

function loadQuestion() {
  if (currentIndex >= words.length) {
    currentWord = "";
    statusIcon.textContent = "🏆";
    progressText.textContent = "Practice completed";
    showFeedback(`Finished! Final score: ${score}/${words.length}`, "correct");
    return;
  }

  currentWord = words[currentIndex];
  answered = false;

  answerInput.value = "";
  answerInput.focus();
  feedback.textContent = "";
  feedback.className = "feedback";
  statusIcon.textContent = "🎧";

  progressText.textContent = `Word ${currentIndex + 1} of ${words.length}`;
  updateProgress();

  setTimeout(speakWord, 300);
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

function checkAnswer() {
  if (!currentWord || answered) return;

  const userAnswer = answerInput.value;

  if (!userAnswer.trim()) {
    showFeedback("Please type your answer first.", "wrong");
    return;
  }

  answered = true;
  attempts++;

  const isCorrect = normalize(userAnswer) === normalize(currentWord);

  if (isCorrect) {
    score++;
    statusIcon.textContent = "✅";
    showFeedback("Correct!", "correct");
  } else {
    statusIcon.textContent = "❌";
    showFeedback(`Wrong! Correct spelling: ${currentWord}`, "wrong");
  }

  addHistory(userAnswer, currentWord, isCorrect);
  updateScore();
  updateProgress();
}

function nextQuestion() {
  if (!currentWord) return;

  if (!answered) {
    showFeedback("Submit your answer before going next.", "wrong");
    return;
  }

  currentIndex++;
  loadQuestion();
}

function updateScore() {
  scoreEl.textContent = score;
  totalEl.textContent = words.length;

  const accuracy = attempts === 0 ? 0 : Math.round((score / attempts) * 100);
  accuracyText.textContent = `Accuracy: ${accuracy}%`;
}

function updateTotal() {
  totalEl.textContent = words.length;
  progressText.textContent = `${words.length} words loaded`;
}

function updateProgress() {
  const percentage = words.length === 0
    ? 0
    : Math.round((currentIndex / words.length) * 100);

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

  updateTotal();
  showFeedback(`${words.length} pasted words loaded.`, "correct");
});

document.addEventListener("keydown", event => {
  if (event.key === "Enter") {
    checkAnswer();
  }

  if (event.ctrlKey && event.key.toLowerCase() === "r") {
    event.preventDefault();
    speakWord();
  }
});

startBtn.addEventListener("click", startPractice);
repeatBtn.addEventListener("click", speakWord);
submitBtn.addEventListener("click", checkAnswer);
nextBtn.addEventListener("click", nextQuestion);

loadDefaultWords();