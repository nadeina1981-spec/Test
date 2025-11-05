// main.js - Main application logic
// Version: 16 (Fix options render + Result screen with fanfare & confetti)

// ========== Audio Setup ==========
const sfx = { 
  click:   new Audio('assets/sfx/click.wav'), 
  success: new Audio('assets/sfx/success.wav'), 
  error:   new Audio('assets/sfx/error.wav'),
  fanfare: new Audio('assets/sfx/fanfare.mp3') // NEW
};

// Общая громкость 40%
Object.values(sfx).forEach(a => {
  a.preload = 'auto'; 
  a.volume = 0.4;
});

// Состояние звука
let soundEnabled = true;

// Проиграть звук (с учетом mute)
function playSound(sound) {
  if (!soundEnabled || !sound) return;
  try {
    sound.currentTime = 0;
    sound.play();
  } catch(e) {}
}

// Переключить звук
function toggleSound() {
  soundEnabled = !soundEnabled;
  const btn = document.getElementById('btn-sound');
  if (btn) {
    btn.textContent = soundEnabled ? '🔊' : '🔇';
    btn.classList.toggle('muted', !soundEnabled);
  }
  try {
    localStorage.setItem('mws-sound-enabled', soundEnabled ? '1' : '0');
  } catch(e) {}
}

// Загрузить предпочтение звука
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

// Разблокировка аудио при первом взаимодействии
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

// ========== Confetti (auto-canvas) ==========
let confettiRAF = null;

function ensureConfettiCanvas() {
  let cvs = document.getElementById('confettiCanvas');
  if (!cvs) {
    cvs = document.createElement('canvas');
    cvs.id = 'confettiCanvas';
    cvs.setAttribute('aria-hidden', 'true');
    // inline-стили, чтобы не лезть в CSS
    cvs.style.position = 'fixed';
    cvs.style.inset = '0';
    cvs.style.width = '100vw';
    cvs.style.height = '100vh';
    cvs.style.display = 'none';
    cvs.style.pointerEvents = 'none';
    cvs.style.zIndex = '9999';
    document.body.appendChild(cvs);
  }
  return cvs;
}

function runConfetti(duration = 3000){
  const cvs = ensureConfettiCanvas();
  const ctx = cvs.getContext('2d');
  const DPR = window.devicePixelRatio || 1;

  function resize(){
    cvs.style.display = 'block';
    cvs.width  = Math.floor(window.innerWidth  * DPR);
    cvs.height = Math.floor(window.innerHeight * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  resize();
  const onResize = () => resize();
  window.addEventListener('resize', onResize, { passive: true });

  const colors = ['#F9C74F','#90BE6D','#F94144','#577590','#F9844A','#43AA8B'];
  const pieces = Array.from({length: 180}, () => ({
    x: Math.random() * cvs.width,
    y: -Math.random() * cvs.height * 0.5,
    r: 2 + Math.random() * 4,
    vx: -1 + Math.random() * 2,
    vy:  2 + Math.random() * 3,
    col: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI,
    vr:  -0.1 + Math.random() * 0.2
  }));

  const t0 = performance.now();
  cancelAnimationFrame(confettiRAF);

  function tick(t){
    const dt = (t - (tick.prev || t)) / 16.7;
    tick.prev = t;

    ctx.clearRect(0, 0, cvs.width, cvs.height);

    for (const p of pieces){
      p.x += p.vx * dt * 1.2;
      p.y += p.vy * dt * 1.2;
      p.rot += p.vr * dt;

      if (p.y > cvs.height + 20) {
        p.y = -20;
        p.x = Math.random() * cvs.width;
      }
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.fillStyle = p.col;
      ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
      ctx.restore();
    }

    if (t - t0 < duration){
      confettiRAF = requestAnimationFrame(tick);
    } else {
      stopConfetti();
      window.removeEventListener('resize', onResize);
    }
  }
  confettiRAF = requestAnimationFrame(tick);
}

function stopConfetti(){
  cancelAnimationFrame(confettiRAF);
  confettiRAF = null;
  const cvs = document.getElementById('confettiCanvas');
  if (cvs) cvs.style.display = 'none';
}

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
  answered: false,
  startedAt: 0 // время старта серии (performance.now)
};

// ========== Utilities ==========
function msToClock(ms){
  const s = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(s / 60)).padStart(2,'0');
  const ss = String(s % 60).padStart(2,'0');
  return `${mm}:${ss}`;
}

// Нормализуем опции ответов к виду {value, correct}
function normalizeOptions(opts, right){
  const out = [];
  for (const o of (opts || [])) {
    if (o && typeof o === 'object') {
      const v = ('value' in o) ? o.value : o.val ?? o.v ?? o.text ?? o.toString();
      out.push({ value: v, correct: o.correct ?? (v === right) });
    } else {
      out.push({ value: o, correct: o === right });
    }
  }
  return out;
}

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
  const raw = Answers.makeOptions(task, state.mode);
  const right = task.answer;

  if (state.mode !== 'input') {
    if (raw && raw.length > 0) {
      const opts = normalizeOptions(raw, right);
      renderOptions(opts);
    } else {
      // Fallback
      const need = Number(state.mode) || 2;
      const set = new Set([right]);
      const deltas = [1, -1, 2, -2, 3, -3, 5, -5];
      for (const d of deltas) { 
        if (set.size >= need) break;
        set.add(right + d);
      }
      const arr = Array.from(set).slice(0, need).map(v => ({ value: v, correct: v === right }));
      renderOptions(arr);
    }
  }
  
  // Show/hide input or buttons based on mode
  const isInputMode = state.mode === 'input';
  const inputWrap = document.getElementById("inputWrap");
  const answersWrap = document.getElementById('answers');
  
  if (isInputMode) {
    inputWrap.hidden = false;
    answersWrap.style.display = 'none';
    const input = document.getElementById("answerInput");
    input.value = '';
    setTimeout(() => input.focus(), 100);
  } else {
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
  state.startedAt = performance.now();
  
  updateStats();
  switchPanel(true);
  nextTask();
}

// ========== Result Screen ==========
function removeResultsScreen(){
  const el = document.getElementById('results-overlay');
  if (el) el.remove();
}

function showResultsScreen(){
  removeResultsScreen();
  const elapsed = performance.now() - (state.startedAt || performance.now());
  const accuracy = state.total ? Math.round((state.correct / state.total) * 100) : 0;

  // контейнер
  const wrap = document.createElement('div');
  wrap.id = 'results-overlay';
  // фон (оранжевый MindWorld, полотно на всю страницу)
  wrap.style.position = 'fixed';
  wrap.style.inset = '0';
  wrap.style.zIndex = '9998';
  wrap.style.display = 'flex';
  wrap.style.alignItems = 'flex-start';
  wrap.style.justifyContent = 'center';
  wrap.style.padding = '72px 16px';
  wrap.style.background = 'linear-gradient(180deg, #EC8D00 0%, #E8654B 100%)';
  wrap.style.overflow = 'auto';

  // карточка результатов
  const card = document.createElement('div');
  card.style.width = 'min(940px, 95vw)';
  card.style.background = '#FFF6EA';
  card.style.borderRadius = '24px';
  card.style.boxShadow = '0 10px 30px rgba(0,0,0,.15)';
  card.style.padding = '24px 24px 20px 24px';

  // заголовок
  const h = document.createElement('h2');
  h.textContent = I18N[state.lang]?.results_title || 'Ти на правильному шляху!';
  h.style.margin = '0 0 16px';
  h.style.fontSize = '28px';
  h.style.fontWeight = '800';
  h.style.color = '#7D733A';

  // прогресс-бар (точность)
  const barWrap = document.createElement('div');
  barWrap.style.height = '10px';
  barWrap.style.borderRadius = '999px';
  barWrap.style.background = '#ffd8ae';
  barWrap.style.overflow = 'hidden';
  barWrap.style.margin = '0 0 16px';

  const bar = document.createElement('div');
  bar.style.height = '10px';
  bar.style.width = `${accuracy}%`;
  bar.style.background = '#E8654B';
  bar.style.transition = 'width .4s ease';
  barWrap.appendChild(bar);

  // грид статистики
  const grid = document.createElement('div');
  grid.style.display = 'grid';
  grid.style.gridTemplateColumns = 'repeat(4, 1fr)';
  grid.style.gap = '12px';
  grid.style.margin = '0 0 16px';

  function makeStat(title, value){
    const box = document.createElement('div');
    box.style.background = '#FFFFFF';
    box.style.borderRadius = '14px';
    box.style.boxShadow = '0 6px 18px rgba(0,0,0,.08)';
    box.style.padding = '14px';
    const t = document.createElement('div');
    t.textContent = title;
    t.style.fontSize = '12px';
    t.style.color = '#7D733A';
    const v = document.createElement('div');
    v.textContent = value;
    v.style.fontSize = '20px';
    v.style.fontWeight = '700';
    v.style.color = '#2F2A1F';
    v.style.marginTop = '4px';
    box.appendChild(t);
    box.appendChild(v);
    return box;
  }

  grid.appendChild(makeStat(I18N[state.lang]?.total_label || 'Всього', String(state.total)));
  grid.appendChild(makeStat(I18N[state.lang]?.correct_label || 'Вірно', String(state.correct)));
  grid.appendChild(makeStat(I18N[state.lang]?.wrong_label || 'Помилки', String(state.wrong)));
  grid.appendChild(makeStat(I18N[state.lang]?.accuracy_label || 'Точність', `${accuracy}%`));

  // строка "Время"
  const timeRow = document.createElement('div');
  timeRow.style.margin = '0 0 8px';
  timeRow.style.color = '#2F2A1F';
  timeRow.style.fontSize = '14px';
  timeRow.textContent = (I18N[state.lang]?.time_label || 'Час') + ': ' + msToClock(elapsed);

  // кнопки
  const btnRow = document.createElement('div');
  btnRow.style.display = 'flex';
  btnRow.style.gap = '10px';

  const btnAgain = document.createElement('button');
  btnAgain.textContent = I18N[state.lang]?.try_again || 'Спробувати ще';
  btnAgain.style.padding = '10px 16px';
  btnAgain.style.border = 'none';
  btnAgain.style.borderRadius = '10px';
  btnAgain.style.background = '#FFB14D';
  btnAgain.style.color = '#2F2A1F';
  btnAgain.style.fontWeight = '700';
  btnAgain.style.cursor = 'pointer';
  btnAgain.addEventListener('click', () => {
    playSound(sfx.click);
    removeResultsScreen();
    stopConfetti();
    // рестарт с теми же настройками
    state.total = 0; state.correct = 0; state.wrong = 0; state.streak = 0;
    state.startedAt = performance.now();
    updateStats();
    switchPanel(true);
    nextTask();
  });

  const btnSettings = document.createElement('button');
  btnSettings.textContent = I18N[state.lang]?.settings || 'Налаштування';
  btnSettings.style.padding = '10px 16px';
  btnSettings.style.border = 'none';
  btnSettings.style.borderRadius = '10px';
  btnSettings.style.background = '#FFFFFF';
  btnSettings.style.boxShadow = '0 4px 14px rgba(0,0,0,.08)';
  btnSettings.style.cursor = 'pointer';
  btnSettings.addEventListener('click', () => {
    playSound(sfx.click);
    removeResultsScreen();
    stopConfetti();
    switchPanel(false);
  });

  btnRow.appendChild(btnAgain);
  btnRow.appendChild(btnSettings);

  // сборка
  card.appendChild(h);
  card.appendChild(barWrap);
  card.appendChild(grid);
  card.appendChild(timeRow);
  card.appendChild(btnRow);
  wrap.appendChild(card);
  document.body.appendChild(wrap);
}

// ========== Check if Series Finished ==========
function finishIfNeeded() {
  if (state.series && state.total >= state.series) {
    // Сначала прячем игровую панель, чтобы не мерцала
    switchPanel(false);
    // Тост + фанфара + конфетти + экран результатов
    showToast('✔️ ' + (I18N[state.lang].total || 'Total') + ': ' + state.total, true);
    playSound(sfx.fanfare);
    runConfetti(4500);
    showResultsScreen();
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
  const answerText = `${task.a} ${task.op} ${task.b} = ${task.answer}`;
  taskEl.textContent = answerText;
  
  // Expand board if long equation
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
  
  // Небольшая пауза и либо финиш, либо следующий пример
  setTimeout(() => {
    if (!finishIfNeeded()) {
      nextTask();
    }
  }, 1200);
}

// ========== Initialize on Page Load ==========
window.addEventListener('DOMContentLoaded', () => {
  // Подготовим confetti canvas
  ensureConfettiCanvas();

  // Активируем кнопку Старт
  const bs = document.getElementById('btn-start');
  if (bs) {
    bs.disabled = false;
    bs.removeAttribute('disabled');
  }
  
  // Загрузка настроек
  const saved = Storage.loadSettings();
  if (saved?.lang) {
    state.lang = saved.lang;
  }
  applyI18n(state.lang);
  
  // Сохранённый звук
  loadSoundPreference();
  
  // Переключатель языка
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
      // Перерисуем заголовки на экране результатов, если открыт
      const ro = document.getElementById('results-overlay');
      if (ro) {
        removeResultsScreen();
        showResultsScreen();
      }
    });
  });
  
  // Восстановить значения в селекторах
  if (saved) {
    document.getElementById("level").value = saved.level || 'easy';
    document.getElementById("mode").value = saved.mode || '2';
    document.getElementById("series").value = String(saved.series ?? 10);
  }
  
  // Слушатели
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
    // Всегда разрешаем next (не блокируем из-за state.answered)
    playSound(sfx.click);
    nextTask();
  });
  
  // Клик по кнопкам-ответам
  document.getElementById("answers").addEventListener('click', (e) => {
    if (state.answered) return;
    const btn = e.target.closest('.answer-btn');
    if (!btn) return;
    handleAnswer(btn.dataset.correct === '1', Number(btn.textContent));
  });
  
  // Отправка ответа из инпута
  document
