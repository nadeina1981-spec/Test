// Handle user answer
function handleAnswer(isCorrect, value) {
  if (state.answered) return; // Prevent multiple answers
  state.answered = true;
  
  // Show correct answer on the board
  const taskEl = document.getElementById('task');
  const task = state.current;
  const answerText = `${task.a} ${task.op} ${task.b} = ${task.answer}`;
  taskEl.textContent = answerText;
  
  // Check if answer is long and expand board
  const board = document.querySelector('.board');
  if (board && answerText.length > 11) {
    board.classList.add('expanded');
  }
  
  // Visual feedback on board
  try {
    if (board) {
      board.classList.remove('correct', 'wrong');
      board.classList.add(isCorrect ? 'correct' : 'wrong');
      setTimeout(() => board.classList.remove('correct', 'wrong'), 800);
    }
  } catch(e) {}
  
  state.total++;
  
  if (isCorrect) {
    state.correct++;
    state.streak++;
    Storage.logResult({ok: true, task: state.current, value});
    
    playSound(sfx.success);
    showToast(I18N[state.lang].right_toast, true);
  } else {
    state.wrong++;
    state.streak = 0;
    Storage.logResult({ok: false, task: state.current, value});
    
    playSound(sfx.error);
    showToast(I18N[state.lang].wrong_toast, false);
  }
  
  updateStats();
  
  // Auto advance after delay - DON'T wait for button
  setTimeout(() => {
    if (!finishIfNeeded()) {
      // Don't auto-advance, just enable Next button
      // User must click Next to continue
    }
  }, 1200);
}// main.js - Main application logic
// Version: 14 (Fixed & Optimized)

// ========== Audio Setup ==========
const sfx = { 
  click: new Audio('assets/sfx/click.wav'), 
  success: new Audio('assets/sfx/success.wav'), 
  error: new Audio('assets/sfx/error.wav')
};

// Reduced volume by 30% (from 70% to 40%)
Object.values(sfx).forEach(a => {
  a.preload = 'auto'; 
  a.volume = 0.4;
});

// Sound mute state
let soundEnabled = true;

// Play sound with mute check
function playSound(sound) {
  if (soundEnabled) {
    try {
      sound.currentTime = 0;
      sound.play();
    } catch(e) {}
  }
}

// Toggle sound on/off
function toggleSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('btn-sound');
  if (btn) {
    btn.textContent = soundEnabled ? '🔊' : '🔇';
    btn.classList.toggle('muted', !soundEnabled);
  }
  // Save preference
  try {
    localStorage.setItem('mws-sound-enabled', soundEnabled ? '1' : '0');
  } catch(e) {}
}

// Load sound preference
function loadSoundPreference() {
  try {
    const saved = localStorage.getItem('mws-sound-enabled');
    if (saved === '0') {
      soundEnabled = false;
      const btn = document.getElementById('btn-sound');
      if (btn) {
        btn.textContent = '🔇';
        btn.classList.add('muted');
      }
    }
  } catch(e) {}
}

// Unlock audio on first user interaction
const unlockAudio = () => {
  try {
    Object.values(sfx).forEach(a => {
      a.play().then(() => a.pause()).catch(() => {});
    });
  } catch(e) {}
  document.removeEventListener('pointerdown', unlockAudio);
  document.removeEventListener('click', unlockAudio);
};

document.addEventListener('pointerdown', unlockAudio, {once: true});
document.addEventListener('click', unlockAudio, {once: true});

// ========== Game State ==========
const state = { 
  lang: 'uk', 
  level: 'easy', 
  mode: '2', 
  series: 10, 
  total: 0, 
  correct: 0, 
  wrong: 0, 
  streak: 0, 
  current: null,
  answered: false
};

// ========== Statistics ==========
function updateStats() { 
  document.getElementById("stat-total").textContent = state.total;
  document.getElementById("stat-correct").textContent = state.correct;
  document.getElementById("stat-wrong").textContent = state.wrong;
  document.getElementById("stat-streak").textContent = state.streak;
}

// ========== Panel Switching ==========
function switchPanel(game) { 
  document.getElementById("panel-settings").hidden = game;
  document.getElementById("panel-game").hidden = !game;
}

// ========== Generate Next Task ==========
function nextTask() {
  const task = Generator.generateTask(state.level);
  state.current = task;
  state.answered = false;
  renderTask(task);
  
  // Task animation
  const tEl = document.getElementById('task');
  tEl.classList.remove('task-anim');
  void tEl.offsetWidth; // Force reflow
  tEl.classList.add('task-anim');
  
  // Generate answer options
  const opts = Answers.makeOptions(task, state.mode);
  
  if (state.mode !== 'input') {
    if (opts && opts.length > 0) {
      renderOptions(opts);
    } else {
      // Fallback: generate simple options if Answers.makeOptions failed
      const right = task.answer;
      const need = Number(state.mode) || 2;
      const set = new Set([right]);
      const deltas = [1, -1, 2, -2, 3, -3, 5, -5];
      
      for (const d of deltas) { 
        if (set.size >= need) break;
        set.add(right + d);
      }
      
      const arr = Array.from(set).slice(0, need).map(v => ({
        value: v, 
        correct: v === right
      }));
      
      renderOptions(arr);
    }
  }
  
  // Show/hide input or buttons based on mode
  const isInputMode = state.mode === 'input';
  const inputWrap = document.getElementById("inputWrap");
  const answersWrap = document.getElementById('answers');
  
  if (isInputMode) {
    // Show input field, hide answer buttons
    inputWrap.hidden = false;
    answersWrap.style.display = 'none';
    const input = document.getElementById("answerInput");
    input.value = '';
    setTimeout(() => input.focus(), 100);
  } else {
    // Hide input field, show answer buttons
    inputWrap.hidden = true;
    answersWrap.style.display = 'flex';
  }
}

// ========== Start Game ==========
function onStart() {
  state.level = document.getElementById("level").value;
  state.mode = document.getElementById("mode").value;
  state.series = Number(document.getElementById("series").value);
  
  Storage.saveSettings({
    level: state.level, 
    mode: state.mode, 
    series: state.series, 
    lang: state.lang
  });
  
  state.total = 0;
  state.correct = 0;
  state.wrong = 0;
  state.streak = 0;
  
  updateStats();
  switchPanel(true);
  nextTask();
}

// ========== Check if Series Finished ==========
function finishIfNeeded() {
  if (state.series && state.total >= state.series) {
    switchPanel(false);
    showToast('✔️ ' + (I18N[state.lang].total || 'Total') + ': ' + state.total, true);
    return true;
  }
  return false;
}

// ========== Handle User Answer ==========
function handleAnswer(isCorrect, value) {
  if (state.answered) return; // Prevent multiple answers
  state.answered = true;
  
  // Show correct answer on the board
  const taskEl = document.getElementById('task');
  const task = state.current;
  taskEl.textContent = `${task.a} ${task.op} ${task.b} = ${task.answer}`;
  
  // Visual feedback on board
  try {
    const board = document.querySelector('.board');
    if (board) {
      board.classList.remove('correct', 'wrong');
      board.classList.add(isCorrect ? 'correct' : 'wrong');
      setTimeout(() => board.classList.remove('correct', 'wrong'), 800);
    }
  } catch(e) {}
  
  state.total++;
  
  if (isCorrect) {
    state.correct++;
    state.streak++;
    Storage.logResult({ok: true, task: state.current, value});
    
    playSound(sfx.success);
    showToast(I18N[state.lang].right_toast, true);
  } else {
    state.wrong++;
    state.streak = 0;
    Storage.logResult({ok: false, task: state.current, value});
    
    playSound(sfx.error);
    showToast(I18N[state.lang].wrong_toast, false);
  }
  
  updateStats();
  
  // Wait before showing next task
  setTimeout(() => {
    if (!finishIfNeeded()) {
      nextTask();
    }
  }, 1200);
}

// ========== Initialize on Page Load ==========
window.addEventListener('DOMContentLoaded', () => {
  // Enable start button
  const bs = document.getElementById('btn-start');
  if (bs) {
    bs.disabled = false;
    bs.removeAttribute('disabled');
  }
  
  // Load saved settings
  const saved = Storage.loadSettings();
  if (saved?.lang) {
    state.lang = saved.lang;
  }
  applyI18n(state.lang);
  
  // Load sound preference
  loadSoundPreference();
  
  // Language switcher
  document.querySelectorAll('.lang-btn').forEach(b => {
    b.addEventListener('click', () => {
      state.lang = b.dataset.lang;
      applyI18n(state.lang);
      Storage.saveSettings({
        level: state.level, 
        mode: state.mode, 
        series: state.series, 
        lang: state.lang
      });
    });
  });
  
  // Restore saved settings
  if (saved) {
    document.getElementById("level").value = saved.level || 'easy';
    document.getElementById("mode").value = saved.mode || '2';
    document.getElementById("series").value = String(saved.series ?? 10);
  }
  
  // Event listeners
  document.getElementById("btn-start").addEventListener('click', () => {
    playSound(sfx.click);
    onStart();
  });
  
  document.getElementById("btn-sound").addEventListener('click', () => {
    toggleSound();
    playSound(sfx.click);
  });
  
  document.getElementById("btn-settings").addEventListener('click', () => {
    playSound(sfx.click);
    switchPanel(false);
  });
  
  document.getElementById("btn-next").addEventListener('click', () => {
    // Always allow next task, remove the state.answered check
    playSound(sfx.click);
    nextTask();
  });
  
  // Answer buttons click
  document.getElementById("answers").addEventListener('click', (e) => {
    if (state.answered) return;
    const btn = e.target.closest('.answer-btn');
    if (!btn) return;
    handleAnswer(btn.dataset.correct === '1', Number(btn.textContent));
  });
  
  // Submit input answer
  document.getElementById("btn-submit").addEventListener('click', () => {
    if (state.answered) return;
    const val = Number(document.getElementById("answerInput").value);
    if (isNaN(val)) return;
    handleAnswer(val === state.current.answer, val);
  });
  
  // Enter key in input mode
  document.getElementById("answerInput").addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      document.getElementById('btn-submit').click();
    }
  });
  
  // Keyboard shortcuts for answer buttons (1, 2, 3)
  document.addEventListener('keydown', (e) => {
    if (document.getElementById("panel-game").hidden) return;
    if (state.answered) return;
    if (state.mode !== 'input') {
      const n = Number(state.mode);
      const idx = ['1', '2', '3'].indexOf(e.key);
      if (idx >= 0 && idx < n) {
        const btn = document.querySelectorAll('#answers .answer-btn')[idx];
        if (btn) btn.click();
      }
    }
  });
});