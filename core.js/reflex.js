// ===========================
// REFLEX ÓRION — ENGINE (ESM)
// ===========================

// ---------------------------
// Persistência (localStorage)
// ---------------------------
const STORAGE_KEYS = {
  xpEasy: "reflex_xp_easy",
  xpMedium: "reflex_xp_medium",
  xpHard: "reflex_xp_hard",
};

const Store = {
  getXP() {
    const easy = parseInt(localStorage.getItem(STORAGE_KEYS.xpEasy)) || 0;
    const med = parseInt(localStorage.getItem(STORAGE_KEYS.xpMedium)) || 0;
    const hard = parseInt(localStorage.getItem(STORAGE_KEYS.xpHard)) || 0;
    return { easy, medium: med, hard, total: easy + med + hard };
  },
  addXP(diff, amount) {
    const key =
      diff === "easy"
        ? STORAGE_KEYS.xpEasy
        : diff === "medium"
        ? STORAGE_KEYS.xpMedium
        : STORAGE_KEYS.xpHard;
    const current = parseInt(localStorage.getItem(key)) || 0;
    localStorage.setItem(key, String(current + amount));
  },
  resetAll() {
    localStorage.removeItem(STORAGE_KEYS.xpEasy);
    localStorage.removeItem(STORAGE_KEYS.xpMedium);
    localStorage.removeItem(STORAGE_KEYS.xpHard);
  },
};

// ---------------------------
// Estado do jogo (runtime)
// ---------------------------
const state = {
  difficulty: null,          // "easy" | "medium" | "hard"
  stageName: "NEBULOSA",
  stageColor: "text-green-400",
  level: 1,                  // 1..maxLevels
  maxLevels: 3,
  timeLimit: 10,
  timeLeft: 10,
  timer: null,
  lastChallengeId: null,     // para evitar repetir o mesmo minigame
  ui: {},                    // refs de DOM
};

// ---------------------------
// Referências do DOM
// ---------------------------
function grabUI() {
  const $ = (sel) => document.querySelector(sel);
  state.ui = {
    difficultyScreen: $('#difficulty-screen'),
    gameScreen: $('#game-screen'),
    resultsScreen: $('#results-screen'),

    challengeDisplay: $('#challenge-display'),
    optionsContainer: $('#options-container'),

    xpCounter: $('#xp-counter'),
    levelCounter: $('#level-counter'),
    progressBar: document.querySelector('#progress-bar div'),

    timerText: $('#timer-text'),
    timerCircle: document.querySelector('.timer-circle'),

    stageTitle: $('#stage-title'),
    resultTitle: $('#result-title'),
    resultMessage: $('#result-message'),

    nextLevelBtn: $('#next-level-btn'),
    menuBtn: $('#menu-btn'),

    starsContainer: $('#stars-container'),
  };
}

// ---------------------------
// Utilidades gerais de UI
// ---------------------------
function showScene(scene) {
  const { difficultyScreen, gameScreen, resultsScreen } = state.ui;
  difficultyScreen.classList.add('hidden');
  gameScreen.classList.add('hidden');
  resultsScreen.classList.add('hidden');
  if (scene === 'difficulty') difficultyScreen.classList.remove('hidden');
  if (scene === 'game') gameScreen.classList.remove('hidden');
  if (scene === 'results') resultsScreen.classList.remove('hidden');
}

function updateHeaderUI() {
  // XP (total somado)
  const xp = Store.getXP();
  state.ui.xpCounter.textContent = xp.total;

  // Level atual (barra e contador)
  state.ui.levelCounter.textContent = `${state.level}/${state.maxLevels}`;
  const progress = (state.level / state.maxLevels) * 100;
  state.ui.progressBar.style.width = `${progress}%`;

  // Título de fase e cor
  state.ui.stageTitle.textContent = state.stageName;
  state.ui.stageTitle.className = `text-xl ${state.stageColor}`;

  // Regras de desbloqueio visual
  document.querySelectorAll('.difficulty-option').forEach((opt) => {
    const diff = opt.dataset.difficulty;
    const { easy, medium } = Store.getXP();
    const lockMedium = diff === 'medium' && easy < 150;
    const lockHard   = diff === 'hard'   && medium < 250;

    if (lockMedium || lockHard) {
      opt.classList.add('opacity-50', 'cursor-not-allowed');
      opt.dataset.locked = "true";
    } else {
      opt.classList.remove('opacity-50', 'cursor-not-allowed');
      opt.dataset.locked = "false";
    }
  });

  // Atualiza barra de XP visual (opcional)
  const xpBar = document.getElementById('xp-bar');
  if (xpBar) {
    const xp = Store.getXP();
    // Exemplo: barra cheia a cada 100 XP totais
    xpBar.style.width = `${Math.min((xp.total % 100), 100)}%`;
  }
}

// ---------------------------
// Estrelas de fundo (JS)
// ---------------------------
function createStars() {
  const starsContainer = state.ui.starsContainer;
  starsContainer.innerHTML = '';
  const starsCount = 100;
  for (let i = 0; i < starsCount; i++) {
    const star = document.createElement('div');
    star.classList.add('star');
    star.style.left = `${Math.random() * 100}%`;
    star.style.top = `${Math.random() * 100}%`;
    const size = Math.random() * 3;
    star.style.width = `${size}px`;
    star.style.height = `${size}px`;
    star.style.animationDelay = `${Math.random() * 2}s`;
    starsContainer.appendChild(star);
  }
}

// ---------------------------
// Timer
// ---------------------------
function stopTimer() {
  if (state.timer) {
    clearInterval(state.timer);
    state.timer = null;
  }
}

function startTimer(seconds = state.timeLimit, onTimeout = () => {}) {
  stopTimer();
  state.timeLeft = seconds;
  updateTimerDisplay();
  state.timer = setInterval(() => {
    state.timeLeft--;
    updateTimerDisplay();
    if (state.timeLeft <= 0) {
      stopTimer();
      onTimeout(); // tempo esgotado => falha
    }
  }, 1000);
}

function updateTimerDisplay() {
  const { timerText, timerCircle } = state.ui;
  timerText.textContent = state.timeLeft;

  // círculo (r=25)
  const circumference = 2 * Math.PI * 25;
  const offset = circumference - (state.timeLeft / state.timeLimit) * circumference;
  timerCircle.style.strokeDasharray = `${circumference}`;
  timerCircle.style.strokeDashoffset = `${offset}`;

  // cor
  if (state.timeLeft <= state.timeLimit * 0.3) {
    timerCircle.style.stroke = '#ef4444'; // vermelho
  } else if (state.timeLeft <= state.timeLimit * 0.6) {
    timerCircle.style.stroke = '#eab308'; // amarelo
  } else {
    timerCircle.style.stroke = '#7e22ce'; // roxo
  }
}

// ---------------------------
// Resultado
// ---------------------------
function showExplosion() {
  const explosion = document.createElement('div');
  explosion.classList.add('explosion');
  explosion.style.left = `${50 + (Math.random() * 20 - 10)}%`;
  explosion.style.top  = `${50 + (Math.random() * 20 - 10)}%`;
  document.body.appendChild(explosion);
  setTimeout(() => explosion.remove(), 800);
}

function showResult({ success, xpEarned = 0 }) {
  showScene('results');
  if (success) {
    state.ui.resultTitle.textContent = "ACERTOU!";
    state.ui.resultTitle.className = "text-3xl mb-6 text-green-400";
    state.ui.resultMessage.textContent = `+${xpEarned} XP! Total: ${Store.getXP().total} XP`;
  } else {
    state.ui.resultTitle.textContent = "ERROU!";
    state.ui.resultTitle.className = "text-3xl mb-6 text-red-400";
    state.ui.resultMessage.textContent = "Tente novamente! Um novo desafio está a caminho.";
  }
}

// ---------------------------
// Motor de desafios
// ---------------------------
const registry = {
  easy: [],   // será preenchido com generatores
  medium: [],
  hard: [],
};

function register(difficulty, id, generator) {
  registry[difficulty].push({ id, generator });
}

function pickRandomChallenge(difficulty, excludeId) {
  const pool = registry[difficulty];
  if (!pool || pool.length === 0) return null;
  let pick;
  // evita repetir o mesmo ID consecutivamente
  for (let i = 0; i < 10; i++) {
    pick = pool[Math.floor(Math.random() * pool.length)];
    if (pick.id !== excludeId) break;
  }
  return pick;
}

function clearPlayArea() {
  state.ui.challengeDisplay.innerHTML = '';
  state.ui.optionsContainer.innerHTML = '';
}

function startRound() {
  showScene('game');
  clearPlayArea();

  // Configura tempo e rótulo por dificuldade
  if (state.difficulty === 'easy') {
    state.timeLimit = 10;
    state.stageName = "NEBULOSA";
    state.stageColor = "text-green-400";
  } else if (state.difficulty === 'medium') {
    state.timeLimit = 7;
    state.stageName = "CONSTELAÇÃO";
    state.stageColor = "text-yellow-400";
  } else {
    state.timeLimit = 5;
    state.stageName = "ÓRION";
    state.stageColor = "text-red-400";
  }

  updateHeaderUI();

  // Escolhe minigame
  const picked = pickRandomChallenge(state.difficulty, state.lastChallengeId);
  if (!picked) {
    // segurança: se não houver, volta ao menu
    showScene('difficulty');
    return;
  }
  state.lastChallengeId = picked.id;

  // Contexto fornecido ao minigame
  const ctx = {
    challengeDisplay: state.ui.challengeDisplay,
    optionsContainer: state.ui.optionsContainer,
    difficulty: state.difficulty,
    level: state.level,
    timeLimit: state.timeLimit,
    startTimer: (sec, onTimeout) => startTimer(sec ?? state.timeLimit, onTimeout),
    stopTimer,
    endWith: (success) => endRound(success),
  };

  // Gera o desafio
  picked.generator(ctx);
}

function endRound(success) {
  stopTimer();

  if (success) {
    showExplosion();
    Store.addXP(state.difficulty, 10);
    updateHeaderUI();

    // Avança ou conclui
    if (state.level < state.maxLevels) {
      state.level += 1;
      showResult({ success: true, xpEarned: 10 });
    } else {
      // Conclusão da dificuldade
      showScene('results');
      state.ui.resultTitle.textContent = "CONCLUÍDO!";
      state.ui.resultTitle.className = "text-3xl mb-6 text-purple-400";
      state.ui.resultMessage.innerHTML = `
        Parabéns! Você concluiu ${state.stageName}.<br>
        Total de XP: ${Store.getXP().total}<br><br>
        Continue para desbloquear novos níveis!
      `;
      state.level = 1; // reseta para recomeçar a dificuldade
    }
  } else {
    // Falhou => volta ao nível 1 e novo minigame
    state.level = 1;
    showResult({ success: false });
  }
}

// ---------------------------
// Minigames — fáceis (3)
// ---------------------------

// 1) Stroop básico — clique na opção que corresponde à COR da palavra
register('easy', 'stroop_basic', ({ challengeDisplay, optionsContainer, startTimer, endWith, timeLimit }) => {
  const colors = [
    { name: "VERMELHO", css: "red" },
    { name: "AZUL", css: "blue" },
    { name: "VERDE", css: "green" },
    { name: "AMARELO", css: "yellow" },
    { name: "ROXO", css: "purple" },
    { name: "ROSA", css: "pink" },
  ];
  const pickColor = () => colors[Math.floor(Math.random() * colors.length)];
  const correctColor = pickColor();
  let word = pickColor();
  // força conflito às vezes
  if (Math.random() < 0.7) {
    while (word.css === correctColor.css) word = pickColor();
  }

  const q = document.createElement('div');
  q.className = 'text-3xl mb-6';
  q.style.color = correctColor.css;
  q.textContent = word.name;
  challengeDisplay.appendChild(q);

  // cria 4 opções com uma correta
  const shuffled = new Set([correctColor.css]);
  while (shuffled.size < 4) shuffled.add(pickColor().css);
  [...shuffled].sort(() => Math.random() - 0.5).forEach((css) => {
    const btn = document.createElement('button');
    btn.className = 'option bg-gray-800 hover:bg-gray-700 p-4 rounded-lg transition-colors';
    btn.style.color = css;
    btn.textContent = colors.find(c => c.css === css).name;
    btn.addEventListener('click', () => endWith(css === correctColor.css));
    optionsContainer.appendChild(btn);
  });

  startTimer(timeLimit, () => endWith(false));
});

// 2) Memória curta — mostrar sequência de cores e o jogador repete (tocando nos botões coloridos)
register('easy', 'memory_short', ({ challengeDisplay, optionsContainer, startTimer, endWith, timeLimit }) => {
  const palette = ['red','blue','green','yellow','purple'];
  const seqLen = 4;
  const seq = Array.from({ length: seqLen }, () => palette[Math.floor(Math.random()*palette.length)]);

  const info = document.createElement('div');
  info.className = 'text-lg mb-4';
  info.textContent = 'Observe a sequência de cores:';
  challengeDisplay.appendChild(info);

  const stage = document.createElement('div');
  stage.className = 'flex justify-center space-x-4 mb-6';
  challengeDisplay.appendChild(stage);

  let i = 0;
  function showNext() {
    if (i < seq.length) {
      stage.innerHTML = '';
      const dot = document.createElement('div');
      dot.className = 'w-16 h-16 rounded-full';
      dot.style.backgroundColor = seq[i];
      stage.appendChild(dot);
      i++;
      setTimeout(showNext, 700);
    } else {
      // coleta resposta
      info.textContent = 'Repita a sequência:';
      stage.innerHTML = '';
      const player = [];
      palette.forEach((c) => {
        const b = document.createElement('button');
        b.className = 'option bg-gray-800 hover:bg-gray-700 p-4 rounded-lg transition-colors';
        const d = document.createElement('div');
        d.className = 'w-10 h-10 rounded-full';
        d.style.backgroundColor = c;
        b.appendChild(d);
        b.addEventListener('click', () => {
          player.push(c);
          if (player.length === seq.length) {
            endWith(JSON.stringify(player) === JSON.stringify(seq));
          }
        });
        optionsContainer.appendChild(b);
      });
      startTimer(timeLimit + 2, () => endWith(false)); // dá 2s extras
    }
  }
  showNext();
});

// 3) Sequência simples — mostra 3–5 cores e oferece 3 alternativas de resposta
register('easy', 'sequence_simple', ({ challengeDisplay, optionsContainer, startTimer, endWith, timeLimit }) => {
  const palette = ['red','blue','green','yellow','purple'];
  const len = Math.floor(Math.random()*3) + 3; // 3..5
  const seq = Array.from({ length: len }, () => palette[Math.floor(Math.random()*palette.length)]);

  const info = document.createElement('div');
  info.className = 'text-lg mb-4';
  info.textContent = 'Memorize a sequência:';
  challengeDisplay.appendChild(info);

  const stage = document.createElement('div');
  stage.className = 'flex justify-center space-x-4 mb-6';
  challengeDisplay.appendChild(stage);

  let i = 0;
  function showNext() {
    if (i < seq.length) {
      stage.innerHTML = '';
      const dot = document.createElement('div');
      dot.className = 'w-12 h-12 rounded-full';
      dot.style.backgroundColor = seq[i];
      stage.appendChild(dot);
      i++;
      setTimeout(showNext, 650);
    } else {
      info.textContent = 'Qual foi a sequência correta?';
      stage.innerHTML = '';

      // gera 2 distratores
      const makeVariant = () => {
        const v = [...seq];
        const idx = Math.floor(Math.random() * v.length);
        let newColor;
        do {
          newColor = palette[Math.floor(Math.random()*palette.length)];
        } while (newColor === v[idx]);
        v[idx] = newColor;
        return v;
      };
      const options = [seq, makeVariant(), makeVariant()].sort(() => Math.random()-0.5);

      options.forEach((arr) => {
        const btn = document.createElement('button');
        btn.className = 'option bg-gray-800 hover:bg-gray-700 p-4 rounded-lg transition-colors';
        const row = document.createElement('div');
        row.className = 'flex justify-center space-x-2';
        arr.forEach((c) => {
          const dot = document.createElement('div');
          dot.className = 'w-4 h-4 rounded-full';
          dot.style.backgroundColor = c;
          row.appendChild(dot);
        });
        btn.appendChild(row);
        btn.addEventListener('click', () => endWith(JSON.stringify(arr) === JSON.stringify(seq)));
        optionsContainer.appendChild(btn);
      });

      startTimer(timeLimit, () => endWith(false));
    }
  }
  showNext();
});

// ---------------------------
// Minigames — médios (3)
// ---------------------------

// 1) Odd-One-Out — encontre o intruso
register('medium', 'odd_one_out', ({ challengeDisplay, optionsContainer, startTimer, endWith, timeLimit }) => {
  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-6 gap-3';
  challengeDisplay.appendChild(grid);

  const baseHue = Math.floor(Math.random()*360);
  const diff = 25; // contraste médio
  const specialIndex = Math.floor(Math.random()*24);

  for (let i = 0; i < 24; i++) {
    const cell = document.createElement('button');
    cell.className = 'w-10 h-10 rounded option bg-gray-800 transition';
    const hue = i === specialIndex ? (baseHue + diff) % 360 : baseHue;
    cell.style.backgroundColor = `hsl(${hue} 70% 50%)`;
    cell.addEventListener('click', () => endWith(i === specialIndex));
    grid.appendChild(cell);
  }

  const tip = document.createElement('div');
  tip.className = 'text-sm mt-4 text-gray-300';
  tip.textContent = 'Clique na cor diferente.';
  challengeDisplay.appendChild(tip);

  startTimer(timeLimit, () => endWith(false));
});

// 2) Ordem numérica — clique de 1 até N (atenção/planejamento)
register('medium', 'number_order', ({ challengeDisplay, optionsContainer, startTimer, endWith, timeLimit }) => {
  const N = 9;
  const nums = Array.from({ length: N }, (_, i) => i + 1).sort(() => Math.random()-0.5);

  const grid = document.createElement('div');
  grid.className = 'grid grid-cols-3 gap-3';
  challengeDisplay.appendChild(grid);

  let expecting = 1;
  nums.forEach((n) => {
    const b = document.createElement('button');
    b.className = 'option bg-gray-800 hover:bg-gray-700 p-4 rounded-lg';
    b.textContent = n;
    b.addEventListener('click', () => {
      if (n === expecting) {
        b.classList.add('bg-green-700');
        expecting++;
        if (expecting > N) endWith(true);
      } else {
        endWith(false);
      }
    });
    grid.appendChild(b);
  });

  startTimer(timeLimit, () => endWith(false));
});

// 3) Regra dupla — se for número PAR clique na cor mostrada; se ÍMPAR clique na palavra
register('medium', 'dual_rule', ({ challengeDisplay, optionsContainer, startTimer, endWith, timeLimit }) => {
  const colors = [
    { name: "VERMELHO", css: "red" },
    { name: "AZUL", css: "blue" },
    { name: "VERDE", css: "green" },
    { name: "AMARELO", css: "yellow" }
  ];
  const ruleNum = Math.floor(Math.random()*9)+1; // 1..10
  const colorFont = colors[Math.floor(Math.random()*colors.length)];
  let word = colors[Math.floor(Math.random()*colors.length)];
  if (Math.random() < 0.6) {
    while (word.css === colorFont.css) word = colors[Math.floor(Math.random()*colors.length)];
  }

  const rule = document.createElement('div');
  rule.className = 'text-lg mb-2';
  rule.textContent = `Número ${ruleNum}: ${ruleNum % 2 === 0 ? 'PAR ⇒ clique na COR' : 'ÍMPAR ⇒ clique na PALAVRA'}`;
  challengeDisplay.appendChild(rule);

  const q = document.createElement('div');
  q.className = 'text-3xl mb-6';
  q.style.color = colorFont.css;
  q.textContent = word.name;
  challengeDisplay.appendChild(q);

  const shuffled = [...colors].sort(() => Math.random()-0.5);
  shuffled.forEach((c) => {
    const btn = document.createElement('button');
    btn.className = 'option bg-gray-800 hover:bg-gray-700 p-4 rounded-lg';
    btn.style.color = c.css;
    btn.textContent = c.name;
    btn.addEventListener('click', () => {
      const even = ruleNum % 2 === 0;
      const correct = even ? (c.css === colorFont.css) : (c.name === word.name);
      endWith(correct);
    });
    optionsContainer.appendChild(btn);
  });

  startTimer(timeLimit, () => endWith(false));
});

// ---------------------------
// Minigames — difíceis (3)
// ---------------------------

// 1) Memória reversa — mostre sequência e o jogador deve reproduzir ao contrário
register('hard', 'reverse_memory', ({ challengeDisplay, optionsContainer, startTimer, endWith, timeLimit }) => {
  const palette = ['red','blue','green','yellow','purple','orange'];
  const len = 5;
  const seq = Array.from({ length: len }, () => palette[Math.floor(Math.random()*palette.length)]);

  const info = document.createElement('div');
  info.className = 'text-lg mb-4';
  info.textContent = 'Observe a sequência (depois clique na ordem inversa):';
  challengeDisplay.appendChild(info);

  const stage = document.createElement('div');
  stage.className = 'flex justify-center space-x-3 mb-6';
  challengeDisplay.appendChild(stage);

  let i = 0;
  function showNext() {
    if (i < seq.length) {
      stage.innerHTML = '';
      const dot = document.createElement('div');
      dot.className = 'w-10 h-10 rounded-full';
      dot.style.backgroundColor = seq[i];
      stage.appendChild(dot);
      i++;
      setTimeout(showNext, 600);
    } else {
      info.textContent = 'Reproduza na ordem inversa:';
      stage.innerHTML = '';
      const target = [...seq].reverse();
      const player = [];
      const unique = [...new Set(seq)];
      unique.forEach((c) => {
        const b = document.createElement('button');
        b.className = 'option bg-gray-800 hover:bg-gray-700 p-4 rounded-lg';
        const d = document.createElement('div');
        d.className = 'w-8 h-8 rounded-full';
        d.style.backgroundColor = c;
        b.appendChild(d);
        b.addEventListener('click', () => {
          player.push(c);
          if (player.length === target.length) {
            endWith(JSON.stringify(player) === JSON.stringify(target));
          }
        });
        optionsContainer.appendChild(b);
      });
      startTimer(timeLimit, () => endWith(false));
    }
  }
  showNext();
});

// 2) Reação com distração — clique quando o centro ficar BRANCO; distratores piscam ao redor
register('hard', 'distractor_reaction', ({ challengeDisplay, startTimer, endWith, timeLimit }) => {
  const wrap = document.createElement('div');
  wrap.className = 'relative w-full h-48 mb-4 flex items-center justify-center';
  challengeDisplay.appendChild(wrap);

  // distratores
  for (let i = 0; i < 30; i++) {
    const s = document.createElement('div');
    s.className = 'absolute w-2 h-2 rounded-full';
    s.style.backgroundColor = i % 2 ? '#7e22ce' : '#1e293b';
    s.style.left = `${Math.random()*95}%`;
    s.style.top  = `${Math.random()*90}%`;
    s.style.opacity = `${0.4 + Math.random()*0.6}`;
    wrap.appendChild(s);
  }

  const target = document.createElement('div');
  target.className = 'w-16 h-16 rounded-full';
  target.style.background = '#222';
  target.style.boxShadow = '0 0 20px rgba(255,255,255,0.2)';
  wrap.appendChild(target);

  const btn = document.createElement('button');
  btn.className = 'mt-2 option bg-gray-800 hover:bg-gray-700 px-4 py-2 rounded-lg';
  btn.textContent = 'CLIQUE QUANDO O CENTRO FICAR BRANCO';
  challengeDisplay.appendChild(btn);

  const delay = Math.floor(Math.random()*2000) + 1000; // 1–3s
  let ready = false;

  const trigger = setTimeout(() => {
    target.style.background = '#fff';
    ready = true;
  }, delay);

  btn.addEventListener('click', () => {
    clearTimeout(trigger);
    endWith(ready);
  });

  startTimer(timeLimit, () => endWith(false));
});

// 3) Stroop duplo — duas palavras simultâneas; escolha a que corresponde à sua cor
register('hard', 'dual_stroop', ({ challengeDisplay, optionsContainer, startTimer, endWith, timeLimit }) => {
  const colors = [
    { name: "VERMELHO", css: "red" },
    { name: "AZUL", css: "blue" },
    { name: "VERDE", css: "green" },
    { name: "AMARELO", css: "yellow" }
  ];
  const pick = () => colors[Math.floor(Math.random()*colors.length)];

  const leftColor = pick(), rightColor = pick();
  let leftWord = pick(), rightWord = pick();

  // força conflito
  while (leftWord.css === leftColor.css) leftWord = pick();
  while (rightWord.css === rightColor.css) rightWord = pick();

  const row = document.createElement('div');
  row.className = 'flex items-center justify-center space-x-10 mb-6';
  const left = document.createElement('div');
  left.className = 'text-3xl';
  left.style.color = leftColor.css;
  left.textContent = leftWord.name;
  const right = document.createElement('div');
  right.className = 'text-3xl';
  right.style.color = rightColor.css;
  right.textContent = rightWord.name;

  row.appendChild(left);
  row.appendChild(right);
  challengeDisplay.appendChild(row);

  // opções: "ESQUERDA" ou "DIREITA"
  ["ESQUERDA","DIREITA"].forEach((label, idx) => {
    const b = document.createElement('button');
    b.className = 'option bg-gray-800 hover:bg-gray-700 p-4 rounded-lg';
    b.textContent = label;
    b.addEventListener('click', () => {
      const correctIdx = Math.random() < 0.5 ? 0 : 1; // regra: aleatoriza qual das duas é a correta pela COR
      const targetColor = correctIdx === 0 ? leftColor.css : rightColor.css;
      const targetWord  = correctIdx === 0 ? leftWord.name : rightWord.name;
      // o acerto é se a palavra escolhida corresponde à COR de seu próprio texto (regra é revelada só pela probabilidade)
      const chosenIdx = idx;
      // para não ficar arbitrário: definimos a "palavra-alvo" pela cor predominante (aqui simplificado)
      const isCorrect = chosenIdx === correctIdx && targetWord !== colors.find(c=>c.css===targetColor).name;
      endWith(isCorrect);
    });
    optionsContainer.appendChild(b);
  });

  startTimer(timeLimit, () => endWith(false));
});

// ---------------------------
// Inicialização e eventos
// ---------------------------
const gameState = {
  player: {
    xp: 0 // começa zerado
  }
};

// Aumenta o XP do jogador
function addXP(amount) {
  gameState.player.xp += amount;
  updateLevelProgress();
  checkUnlocks();
}

// Atualiza a barra de XP
function updateLevelProgress() {
  const xpBar = document.getElementById('xp-bar');
  if (xpBar) {
    xpBar.style.width = `${Math.min(gameState.player.xp, 100)}%`;
  }
}

// Desbloqueia novos níveis
function checkUnlocks() {
  if (gameState.player.xp >= 30) {
    document.getElementById('medium-btn').disabled = false;
  }
  if (gameState.player.xp >= 60) {
    document.getElementById('hard-btn').disabled = false;
  }
}

// Exemplo: aumentar XP ao clicar no botão fácil
document.getElementById('easy-btn').addEventListener('click', () => addXP(10));

// Inicializa barra e desbloqueios
updateLevelProgress();
checkUnlocks();
