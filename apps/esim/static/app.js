'use strict';

const PART_SIZE = 25;

// ── State ────────────────────────────────────────────────
let allQuestions  = [];   // document order, full set
let parts         = [];   // [{label, range, questions}]
let selectedPart  = 0;    // index into parts (0 = "All")
let questions     = [];   // active session slice
let progress      = [];   // per-question: { selected: string[], submitted: bool }
let currentIdx    = 0;
let score         = 0;
let answered      = 0;

// ── DOM refs ─────────────────────────────────────────────
const screens = {
  loading: document.getElementById('screen-loading'),
  start:   document.getElementById('screen-start'),
  quiz:    document.getElementById('screen-quiz'),
  results: document.getElementById('screen-results'),
};

const qCounter        = document.getElementById('q-counter');
const scoreDisplay    = document.getElementById('score-display');
const progressBar     = document.getElementById('progress-bar');
const qNumber         = document.getElementById('question-number');
const qText           = document.getElementById('question-text');
const choicesEl       = document.getElementById('choices');
const feedbackEl      = document.getElementById('feedback');
const explanationEl   = document.getElementById('explanation');
const btnSubmit       = document.getElementById('btn-submit');
const btnNext         = document.getElementById('btn-next');
const btnPrev         = document.getElementById('btn-prev');
const btnStart        = document.getElementById('btn-start');
const btnRestart      = document.getElementById('btn-restart');
const toggleRandomize = document.getElementById('toggle-randomize');
const startTotal      = document.getElementById('start-total');
const startPartCount  = document.getElementById('start-part-count');
const partGrid        = document.getElementById('part-grid');
const headerPart      = document.getElementById('header-part');

// ── Screens ──────────────────────────────────────────────
function showScreen(name) {
  Object.entries(screens).forEach(([k, el]) => el.classList.toggle('hidden', k !== name));
}

// ── Fisher-Yates shuffle (in-place) ─────────────────────
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// ── Build parts array from question list ─────────────────
function buildParts(qs) {
  const result = [];

  // "All" entry
  result.push({ label: 'All', range: `All ${qs.length} questions`, questions: qs });

  // 50-question chunks
  for (let start = 0; start < qs.length; start += PART_SIZE) {
    const slice  = qs.slice(start, start + PART_SIZE);
    const end    = start + slice.length;
    const num    = result.length;   // 1-based part number
    result.push({
      label:     `Part ${num}`,
      range:     `Q${start + 1} – Q${end}`,
      questions: slice,
    });
  }

  return result;
}

// ── Render part selector grid ────────────────────────────
function renderPartGrid() {
  partGrid.innerHTML = '';
  parts.forEach((part, idx) => {
    const btn = document.createElement('button');
    btn.className = 'part-btn' + (idx === selectedPart ? ' part-btn-active' : '');
    btn.innerHTML =
      `<span class="part-btn-label">${part.label}</span>` +
      `<span class="part-btn-range">${part.range}</span>`;
    btn.addEventListener('click', () => {
      selectedPart = idx;
      partGrid.querySelectorAll('.part-btn').forEach((b, i) =>
        b.classList.toggle('part-btn-active', i === idx)
      );
    });
    partGrid.appendChild(btn);
  });
}

// ── Load questions from API ──────────────────────────────
async function loadQuestions() {
  showScreen('loading');
  try {
    const res = await fetch('/api/questions');
    if (!res.ok) throw new Error(res.statusText);
    allQuestions = await res.json();
    initStartScreen();
    showScreen('start');
  } catch (err) {
    screens.loading.innerHTML =
      `<p style="color:#ea4335;font-size:1.05rem">Failed to load questions.<br>${err.message}<br>
       <button onclick="loadQuestions()" style="margin-top:16px;padding:10px 24px;
       background:#1a73e8;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:.95rem">
       Retry</button></p>`;
  }
}

function initStartScreen() {
  parts = buildParts(allQuestions);
  selectedPart = 0;

  startTotal.textContent     = allQuestions.length;
  startPartCount.textContent = parts.length - 1;  // exclude "All"

  renderPartGrid();
}

// ── Begin quiz session ───────────────────────────────────
function startQuiz() {
  // Re-fetch so any updated docx is picked up.
  fetch('/api/questions')
    .then(r => r.json())
    .then(fresh => { allQuestions = fresh; beginSession(); })
    .catch(() => beginSession());
}

function beginSession() {
  // Re-build parts in case bank changed
  parts = buildParts(allQuestions);
  // Clamp selectedPart in case bank shrank
  if (selectedPart >= parts.length) selectedPart = 0;

  questions = [...parts[selectedPart].questions];
  if (toggleRandomize.checked) shuffle(questions);

  // Fresh per-question state so users can navigate freely and revisit answers.
  progress   = questions.map(() => ({ selected: [], submitted: false }));
  currentIdx = 0;
  score      = 0;
  answered   = 0;

  // Show part badge in header
  const p = parts[selectedPart];
  if (selectedPart === 0) {
    headerPart.classList.add('hidden');
  } else {
    headerPart.textContent = `${p.label}  ·  ${p.range}`;
    headerPart.classList.remove('hidden');
  }

  showScreen('quiz');
  renderQuestion();
}

// ── Render a question ────────────────────────────────────
function renderQuestion() {
  const q     = questions[currentIdx];
  const total = questions.length;
  const state = progress[currentIdx];
  const correctLetters = q.choices.filter(c => c.correct).map(c => c.letter);
  const isMulti = correctLetters.length > 1;

  qCounter.textContent     = `${currentIdx + 1} / ${total}`;
  scoreDisplay.textContent = `${score} / ${answered}`;
  progressBar.style.width  = `${((currentIdx + 1) / total) * 100}%`;
  // q.id is the question's stable 0-based position across the *whole* bank
  // (assigned by the backend, same document order the Part N · Qx-Qy ranges
  // are built from) -- currentIdx is only the position within this session's
  // slice, which resets to 0 for every part and was showing e.g. "Q9" for
  // the 9th question of Part 2 instead of its real number "Q34".
  qNumber.textContent      = `Q${q.id + 1}`;

  qText.innerHTML = '';
  q.text.split('\n').forEach(line => {
    const p = document.createElement('p');
    p.textContent = line;
    qText.appendChild(p);
  });

  if (isMulti) {
    const hint = document.createElement('div');
    hint.className   = 'multi-hint';
    hint.textContent = `✦ Select ${correctLetters.length} answers`;
    qText.appendChild(hint);
  }

  choicesEl.innerHTML = '';
  q.choices.forEach(choice => {
    const label = document.createElement('label');
    label.className = 'choice';

    const input = document.createElement('input');
    input.type  = isMulti ? 'checkbox' : 'radio';
    input.name  = 'choice';
    input.value = choice.letter;
    input.checked = state.selected.includes(choice.letter);

    const letterBadge = document.createElement('span');
    letterBadge.className   = 'choice-letter';
    letterBadge.textContent = choice.letter;

    const body = document.createElement('span');
    body.className   = 'choice-body';
    body.textContent = choice.text;

    label.appendChild(input);
    label.appendChild(letterBadge);
    label.appendChild(body);
    choicesEl.appendChild(label);

    if (state.submitted) input.disabled = true;
    else input.addEventListener('change', onChoiceChange);
  });

  feedbackEl.className = 'feedback hidden';
  feedbackEl.innerHTML = '';
  explanationEl.className = 'explanation hidden';
  explanationEl.innerHTML = '';

  // Already-answered question: re-show the graded view (correct/wrong + explanation).
  if (state.submitted) gradeAndReveal(q, state.selected);

  updateNavButtons();
}

// ── Persist the current selection as the user clicks ─────
function onChoiceChange() {
  const state = progress[currentIdx];
  state.selected = Array.from(choicesEl.querySelectorAll('input:checked')).map(i => i.value);
  updateNavButtons();
}

// ── Show/enable the right buttons for the current question ─
function updateNavButtons() {
  const state  = progress[currentIdx];
  const isLast = currentIdx === questions.length - 1;

  btnPrev.disabled = currentIdx === 0;
  btnNext.textContent = isLast ? 'Finish' : 'Next →';

  if (state.submitted) {
    btnSubmit.classList.add('hidden');
  } else {
    btnSubmit.classList.remove('hidden');
    btnSubmit.disabled = state.selected.length === 0;
  }
}

// ── Submit answer ────────────────────────────────────────
function submitAnswer() {
  const state = progress[currentIdx];
  if (state.submitted) return;  // already graded — ignore

  const q = questions[currentIdx];
  const correctLetters  = q.choices.filter(c => c.correct).map(c => c.letter);
  const selectedLetters = Array.from(
    choicesEl.querySelectorAll('input:checked')
  ).map(i => i.value);
  if (selectedLetters.length === 0) return;

  const isCorrect =
    selectedLetters.length === correctLetters.length &&
    selectedLetters.every(l => correctLetters.includes(l));

  // Persist so navigating away and back keeps the result (and the score is
  // counted only once).
  state.selected  = selectedLetters;
  state.submitted = true;
  answered++;
  if (isCorrect) score++;

  gradeAndReveal(q, selectedLetters);
  updateNavButtons();
  scoreDisplay.textContent = `${score} / ${answered}`;
}

// ── Reveal correctness, feedback and explanation ─────────
// Pure rendering from the saved selection, so it works both on first submit
// and when revisiting an already-answered question.
function gradeAndReveal(q, selectedLetters) {
  const correctLetters = q.choices.filter(c => c.correct).map(c => c.letter);
  const isCorrect =
    selectedLetters.length === correctLetters.length &&
    selectedLetters.every(l => correctLetters.includes(l));

  choicesEl.querySelectorAll('.choice').forEach(label => {
    const input    = label.querySelector('input');
    const letter   = input.value;
    const selected = selectedLetters.includes(letter);
    const correct  = correctLetters.includes(letter);

    label.classList.add('revealed');
    input.disabled = true;

    if (correct && selected)       label.classList.add('is-correct-selected');
    else if (!correct && selected) label.classList.add('is-wrong-selected');
    else if (correct && !selected) label.classList.add('is-missed');
  });

  feedbackEl.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
  if (isCorrect) {
    feedbackEl.innerHTML = '<span class="feedback-icon">✓</span> Correct!';
  } else {
    // List just the letters — the correct choices are already highlighted
    // below, so dumping their (possibly multi-line) text here is redundant.
    const letters = correctLetters.join(', ');
    feedbackEl.innerHTML =
      `<span class="feedback-icon">✗</span> Incorrect — correct answer${correctLetters.length > 1 ? 's' : ''}: <strong>${letters}</strong>`;
  }

  // Show the explanation (green-font text from the docx) when the question has
  // one; questions without an explanation skip this section entirely.
  if (q.explanation) {
    explanationEl.innerHTML = '';
    const title = document.createElement('div');
    title.className = 'explanation-title';
    title.textContent = 'Explanation';
    explanationEl.appendChild(title);
    q.explanation.split('\n').forEach(line => {
      const text = line.trim();
      if (!text || /^explanation\s*:?\s*$/i.test(text)) return;  // skip the redundant header
      const p = document.createElement('p');
      p.textContent = text;
      explanationEl.appendChild(p);
    });
    explanationEl.className = 'explanation';
  }
}

// ── Navigation (free movement, no submit required) ───────
function nextQuestion() {
  if (currentIdx >= questions.length - 1) {
    showResults();   // "Finish" on the last question
    return;
  }
  currentIdx++;
  renderQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function prevQuestion() {
  if (currentIdx === 0) return;
  currentIdx--;
  renderQuestion();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ── Results screen ───────────────────────────────────────
function showResults() {
  const total   = questions.length;
  const pct     = total > 0 ? Math.round((score / total) * 100) : 0;
  const passing = pct >= 70;
  const CIRC    = 2 * Math.PI * 50;

  document.getElementById('result-pct').textContent    = `${pct}%`;
  document.getElementById('result-frac').textContent   = `${score} / ${total}`;
  document.getElementById('res-correct').textContent   = score;
  document.getElementById('res-incorrect').textContent = total - score;

  const ringFill = document.getElementById('ring-fill');
  ringFill.classList.toggle('pass', passing);
  ringFill.classList.toggle('fail', !passing);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    ringFill.style.strokeDashoffset = CIRC - (pct / 100) * CIRC;
  }));

  let emoji, msg;
  if      (pct >= 90) { emoji = '🏆'; msg = 'Outstanding! You are fully exam-ready.'; }
  else if (pct >= 70) { emoji = '✅'; msg = 'Good pass! Review any missed areas before test day.'; }
  else if (pct >= 50) { emoji = '📚'; msg = 'Getting there — keep studying and try again.'; }
  else                { emoji = '💪'; msg = 'More practice needed. Review the study guide and retry.'; }

  document.getElementById('results-emoji').textContent = emoji;
  document.getElementById('result-msg').textContent    = msg;

  showScreen('results');
}

// ── Event wiring ─────────────────────────────────────────
btnStart.addEventListener('click', startQuiz);
btnSubmit.addEventListener('click', submitAnswer);
btnNext.addEventListener('click', nextQuestion);
btnPrev.addEventListener('click', prevQuestion);
btnRestart.addEventListener('click', () => {
  initStartScreen();
  showScreen('start');
});

document.addEventListener('keydown', e => {
  if (screens.quiz.classList.contains('hidden')) return;  // only on the quiz screen
  if (e.key === 'Enter') {
    if (!btnSubmit.classList.contains('hidden') && !btnSubmit.disabled) submitAnswer();
    else nextQuestion();
  } else if (e.key === 'ArrowRight') {
    nextQuestion();
  } else if (e.key === 'ArrowLeft') {
    prevQuestion();
  }
});

// ── Boot ─────────────────────────────────────────────────
loadQuestions();
