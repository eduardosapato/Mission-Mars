// ===================== QUESTIONS DATABASE =====================
const questionsByPhase = {
  // Fáceis — Fases 1-2
  easy: [
    { q: "Qual linguagem usa 0 e 1?", opts: ["Java","Python","Maquina","HTML"], a: 2 },
    { q: "O Assembly usa:", opts: ["Emojis","Mnemonicos","Imagens","Sons"], a: 1 },
    { q: "Quem traduz codigo completo?", opts: ["Cache","BIOS","Compilador","RAM"], a: 2 },
    { q: "Qual e interpretada?", opts: ["C","C++","Python","Assembly"], a: 2 },
    { q: "O HTML serve para:", opts: ["Jogos","Banco de dados","Formatacao","Drivers"], a: 2 },
    { q: "O SQL e usado em:", opts: ["Videos","Banco de dados","Jogos","BIOS"], a: 1 },
    { q: "O primeiro microprocessador foi:", opts: ["Ryzen","Pentium","Intel 4004","Celeron"], a: 2 },
    { q: "A ULA realiza:", opts: ["Downloads","Calculos","Impressoes","Boot"], a: 1 },
    { q: "O clock e medido em:", opts: ["Bytes","Volts","Hertz","Pixels"], a: 2 },
    { q: "A RAM e memoria:", opts: ["Secundaria","Virtual","Principal","Optica"], a: 2 },
  ],
  // Medias — Fases 3-4
  medium: [
    { q: "O contador de programa guarda:", opts: ["Resultado","Proxima instrucao","Senha","Clock"], a: 1 },
    { q: "Threads representam:", opts: ["Memorias","Cabos","Tarefas","Pixels"], a: 2 },
    { q: "Hyper-Threading permite:", opts: ["Menos nucleos","Dois logicos","Menos cache","Menos RAM"], a: 1 },
    { q: "DDR significa:", opts: ["Data Disk Rate","Double Data Rate","Dynamic Data RAM","Double Device RAM"], a: 1 },
    { q: "Um SSD possui:", opts: ["Partes moveis","Agulhas","Discos opticos","Sem partes moveis"], a: 3 },
    { q: "A cache reduz acesso a:", opts: ["BIOS","GPU","RAM","Fonte"], a: 2 },
    { q: "Localidade temporal significa:", opts: ["Mesmo dado novamente","Dados aleatorios","Dados apagados","Mais nucleos"], a: 0 },
  ],
  // Difíceis — Fases 5-6
  hard: [
    { q: "Arquitetura usada em smartphones:", opts: ["CISC","ARM/RISC","x86","Pentium"], a: 1 },
    { q: "Em 32 bits, a RAM maxima e:", opts: ["1 GB","2 GB","4 GB","8 GB"], a: 2 },
    { q: "Pipeline permite:", opts: ["Menos cache","Instrucoes simultaneas","Menos clock","Menos registradores"], a: 1 },
  ],
  // Boss — Expert (reutiliza difíceis + extras avançadas)
  boss: [
    { q: "Arquitetura usada em smartphones:", opts: ["CISC","ARM/RISC","x86","Pentium"], a: 1 },
    { q: "Em 32 bits, a RAM maxima e:", opts: ["1 GB","2 GB","4 GB","8 GB"], a: 2 },
    { q: "Pipeline permite:", opts: ["Menos cache","Instrucoes simultaneas","Menos clock","Menos registradores"], a: 1 },
    { q: "O que e CISC?", opts: ["Instrucoes simples","Instrucoes complexas e variadas","Protocolo de rede","Tipo de RAM"], a: 1 },
    { q: "O que e um compilador?", opts: ["Interpreta linha a linha","Traduz codigo inteiro para executavel","Gerencia memoria","Controla o clock"], a: 1 },
    { q: "Hyper-Threading dobra:", opts: ["Cache L1","Nucleos fisicos","Nucleos logicos","Clock"], a: 2 },
    { q: "DDR4 vs DDR3:", opts: ["DDR3 e mais rapido","DDR4 tem maior largura de banda","Sao identicos","DDR3 usa menos energia"], a: 1 },
    { q: "A ULA faz parte da:", opts: ["RAM","GPU","CPU","BIOS"], a: 2 },
  ]
};

function getQuestionsForPhase(phase) {
  // Todas as perguntas misturadas em todas as fases
  return [
    ...questionsByPhase.easy,
    ...questionsByPhase.medium,
    ...questionsByPhase.hard,
  ];
}

// ===================== GAME STATE =====================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const starsCanvas = document.getElementById('starsBg');
const starsCtx = starsCanvas.getContext('2d');

const W = 480, H = 640;

let gameState = 'menu'; // menu, playing, quiz, bossquiz, gameover, win
let animFrame;

const state = {
  ship: { x: 220, y: 520, w: 40, h: 50, speed: 5, flame: 0 },
  health: 100,
  score: 0,
  phase: 1,
  phaseProgress: 0,
  phaseDuration: 3200, // frames per phase
  obstacles: [],
  particles: [],
  bossHealth: 100,
  bossX: 200, bossY: 80,
  bossDir: 1,
  bossActive: false,
  bossProjectiles: [],
  keys: {},
  correctAnswers: 0,
  wrongAnswers: 0,
  quizPending: false,
  invincible: 0,
  damageFlash: 0,
  quizUsedQuestions: new Set(),
  bossQuizCount: 0,
  shields: 0,
  nextQuizForced: false, // true = próxima pergunta com alternativas obrigatório
  totalPhases: 6,
};

// ===================== STARS =====================
const stars = [];
for (let i = 0; i < 120; i++) {
  stars.push({ x: Math.random()*W, y: Math.random()*H, size: Math.random()*2+0.5, speed: Math.random()*0.5+0.2, bright: Math.random() });
}

function drawStars(phase) {
  starsCtx.clearRect(0, 0, W, H);
  const alpha = Math.min(1, (phase - 1) / 3);
  stars.forEach(s => {
    const blink = 0.5 + 0.5 * Math.sin(Date.now() * 0.001 * s.bright * 3);
    starsCtx.fillStyle = `rgba(${180 + s.bright*75}, ${180 + s.bright*75}, 255, ${(0.4 + 0.6*blink) * alpha})`;
    starsCtx.fillRect(Math.floor(s.x), Math.floor(s.y), Math.ceil(s.size), Math.ceil(s.size));
    s.y += s.speed;
    if (s.y > H) { s.y = 0; s.x = Math.random() * W; }
  });
}

// ===================== PIXEL ART DRAWINGS =====================
function drawShip(x, y, damaged) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));

  // Damage tint
  if (damaged > 0) {
    ctx.globalAlpha = 0.7 + 0.3 * Math.sin(Date.now() * 0.05);
  }

  // Engine flame
  const flameH = 8 + Math.sin(Date.now() * 0.02) * 4;
  ctx.fillStyle = '#ff6600';
  ctx.fillRect(14, 44, 5, flameH);
  ctx.fillRect(21, 44, 5, flameH);
  ctx.fillStyle = '#ffff00';
  ctx.fillRect(15, 44, 3, flameH - 3);
  ctx.fillRect(22, 44, 3, flameH - 3);

  // Body
  ctx.fillStyle = damaged > 0 ? '#884400' : '#aabbcc';
  ctx.fillRect(16, 10, 8, 34);
  ctx.fillRect(12, 20, 16, 20);
  ctx.fillRect(8, 30, 8, 14);
  ctx.fillRect(24, 30, 8, 14);

  // Cockpit
  ctx.fillStyle = '#00ccff';
  ctx.fillRect(17, 14, 6, 8);
  ctx.fillStyle = '#005588';
  ctx.fillRect(18, 15, 4, 6);

  // Wings
  ctx.fillStyle = damaged > 0 ? '#663300' : '#778899';
  ctx.fillRect(4, 32, 8, 10);
  ctx.fillRect(28, 32, 8, 10);

  // Wing tips
  ctx.fillStyle = '#ff2244';
  ctx.fillRect(4, 32, 3, 3);
  ctx.fillRect(33, 32, 3, 3);

  // Detail lines
  ctx.fillStyle = '#556677';
  ctx.fillRect(16, 24, 1, 16);
  ctx.fillRect(23, 24, 1, 16);

  ctx.restore();
}

function drawBird(x, y, frame) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  const wing = Math.sin(frame * 0.3) > 0 ? 3 : -2;
  ctx.fillStyle = '#334455';
  ctx.fillRect(0, 0, 20, 8);
  ctx.fillStyle = '#ffaa00';
  ctx.fillRect(18, 2, 4, 3);
  ctx.fillStyle = '#223344';
  ctx.fillRect(-8, wing, 12, 4);
  ctx.fillRect(16, wing, 12, 4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(15, 1, 2, 2);
  ctx.fillStyle = '#000';
  ctx.fillRect(15, 1, 1, 1);
  ctx.restore();
}

function drawPlane(x, y) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.fillStyle = '#aabbcc';
  ctx.fillRect(0, 8, 40, 12);
  ctx.fillStyle = '#ccddee';
  ctx.fillRect(28, 4, 14, 16);
  ctx.fillStyle = '#334455';
  ctx.fillRect(6, 4, 8, 6);
  ctx.fillStyle = '#889900';
  ctx.fillRect(10, 10, 16, 5);
  ctx.fillRect(10, 15, 6, 8);
  ctx.fillStyle = '#ff2200';
  ctx.fillRect(38, 2, 4, 18);
  ctx.restore();
}

function drawSatellite(x, y, rot) {
  ctx.save();
  ctx.translate(Math.floor(x)+16, Math.floor(y)+16);
  ctx.rotate(rot);
  ctx.fillStyle = '#888899';
  ctx.fillRect(-8, -6, 16, 12);
  ctx.fillStyle = '#0044aa';
  ctx.fillRect(-28, -4, 18, 8);
  ctx.fillRect(10, -4, 18, 8);
  ctx.fillStyle = '#00ccff';
  ctx.fillRect(-26, -2, 14, 4);
  ctx.fillRect(12, -2, 14, 4);
  ctx.restore();
}

function drawMeteor(x, y, size) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.fillStyle = '#664433';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#884422';
  ctx.fillRect(2, 2, size-4, size-4);
  ctx.fillStyle = '#553322';
  ctx.fillRect(size/2|0, 2, 3, 3);
  ctx.fillRect(3, size/2|0, 4, 4);
  ctx.restore();
}

function drawAsteroid(x, y, size) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.fillStyle = '#554433';
  ctx.fillRect(2, 0, size-4, size);
  ctx.fillRect(0, 2, size, size-4);
  ctx.fillStyle = '#665544';
  ctx.fillRect(3, 3, size-6, size-6);
  ctx.fillStyle = '#443322';
  ctx.fillRect(4, 4, 4, 4);
  ctx.fillRect(size-8, size-8, 4, 4);
  ctx.restore();
}

function drawDebris(x, y) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  ctx.fillStyle = '#556677';
  ctx.fillRect(0, 0, 14, 6);
  ctx.fillRect(2, -4, 8, 4);
  ctx.fillStyle = '#ff4400';
  ctx.fillRect(10, -2, 4, 2);
  ctx.restore();
}

function drawBoss(x, y, health) {
  ctx.save();
  ctx.translate(Math.floor(x), Math.floor(y));
  const t = Date.now();
  const pulse = Math.sin(t * 0.004) * 2;
  const breathe = Math.sin(t * 0.003) * 1.5;
  const hRatio = health / 100;

  // Skin color shifts green→yellow→red as damaged
  const skinR = hRatio > 0.5 ? Math.floor(30 + (1-hRatio)*80) : Math.floor(30 + (1-hRatio)*200);
  const skinG = Math.floor(180 * hRatio + 60);
  const skinB = Math.floor(30 + hRatio * 20);
  const skin  = `rgb(${skinR},${skinG},${skinB})`;
  const skinDark = `rgb(${Math.floor(skinR*0.6)},${Math.floor(skinG*0.6)},${Math.floor(skinB*0.6)})`;

  // === EARS / HEAD PROTRUSIONS (pointy, like image) ===
  // Left ear
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.moveTo(14, 28+pulse);
  ctx.lineTo(2,  8+pulse);
  ctx.lineTo(22, 22+pulse);
  ctx.fill();
  // Right ear
  ctx.beginPath();
  ctx.moveTo(66, 28+pulse);
  ctx.lineTo(78, 8+pulse);
  ctx.lineTo(58, 22+pulse);
  ctx.fill();

  // === BIG ROUND HEAD (dominant feature from image) ===
  ctx.fillStyle = skin;
  // Head: wide oval, tall — matches the photo
  for (let row = 0; row < 52; row++) {
    const headW = Math.floor(Math.sqrt(Math.max(0, 676 - (row-26)*(row-26))) * 1.55);
    const cx2 = 40;
    ctx.fillRect(cx2 - headW, row + 4 + pulse, headW*2, 1);
  }

  // === CHIN / NECK taper ===
  ctx.fillStyle = skin;
  ctx.fillRect(26, 52+pulse, 28, 10+breathe);
  ctx.fillRect(29, 60+pulse, 22, 8+breathe);
  ctx.fillRect(32, 66+pulse, 16, 6);

  // === BODY (smaller than head, like the image) ===
  ctx.fillStyle = skinDark;
  ctx.fillRect(22, 70+pulse, 36, 28+breathe);
  ctx.fillRect(18, 74+pulse, 44, 18);

  // === LARGE BLACK ALMOND EYES (key feature from image) ===
  // Left eye — almond shape
  ctx.fillStyle = '#000';
  ctx.beginPath();
  ctx.ellipse(27, 24+pulse, 11, 7, -0.25, 0, Math.PI*2);
  ctx.fill();
  // Right eye
  ctx.beginPath();
  ctx.ellipse(53, 24+pulse, 11, 7, 0.25, 0, Math.PI*2);
  ctx.fill();

  // Eye shine (subtle reflection like the photo)
  ctx.fillStyle = 'rgba(80,80,120,0.6)';
  ctx.beginPath();
  ctx.ellipse(24, 21+pulse, 4, 2.5, -0.3, 0, Math.PI*2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(50, 21+pulse, 4, 2.5, 0.3, 0, Math.PI*2);
  ctx.fill();

  // === TINY NOSTRILS (two small slits) ===
  ctx.fillStyle = skinDark;
  ctx.fillRect(36, 38+pulse, 3, 4);
  ctx.fillRect(41, 38+pulse, 3, 4);

  // === SMALL MOUTH (barely visible, like image) ===
  ctx.fillStyle = skinDark;
  ctx.fillRect(33, 46+pulse, 14, 2);

  // === NECK SHADOW ===
  ctx.fillStyle = skinDark;
  ctx.fillRect(30, 62+pulse, 20, 4);

  // === ARMS ===
  ctx.fillStyle = skin;
  // Left arm
  ctx.fillRect(8, 72+pulse, 14, 6+breathe);
  ctx.fillRect(4, 76+pulse, 10, 14+breathe);
  // Right arm
  ctx.fillRect(58, 72+pulse, 14, 6+breathe);
  ctx.fillRect(66, 76+pulse, 10, 14+breathe);

  // === DAMAGE FLASH: red tint when nearly dead ===
  if (hRatio < 0.3) {
    ctx.fillStyle = `rgba(255,0,0,${0.15 + Math.sin(t*0.02)*0.1})`;
    for (let row = 0; row < 52; row++) {
      const hw = Math.floor(Math.sqrt(Math.max(0, 676-(row-26)*(row-26)))*1.55);
      ctx.fillRect(40-hw, row+4+pulse, hw*2, 1);
    }
  }

  ctx.restore();
}

function drawProjectile(x, y, isBoss) {
  ctx.fillStyle = isBoss ? '#ff00ff' : '#00ffff';
  ctx.fillRect(Math.floor(x)-2, Math.floor(y)-6, 4, 12);
}

function drawMars(progress) {
  // Mars appears as phase 6 ends
  const alpha = Math.max(0, (progress - 0.7) / 0.3);
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#cc4400';
  const r = 80 + Math.sin(Date.now()*0.001)*2;
  ctx.beginPath();
  ctx.arc(W/2, 100, r, 0, Math.PI*2);
  ctx.fill();
  ctx.fillStyle = '#aa3300';
  ctx.fillRect(W/2-40, 70, 80, 20);
  ctx.fillStyle = '#dd5500';
  ctx.fillRect(W/2-20, 90, 40, 15);
  ctx.restore();
}

// ===================== PARTICLES =====================
function spawnParticles(x, y, color, count=8) {
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const speed = 1 + Math.random() * 3;
    state.particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1, decay: 0.03 + Math.random()*0.04,
      size: 2 + Math.random() * 3,
      color
    });
  }
}

function updateParticles() {
  state.particles = state.particles.filter(p => {
    p.x += p.vx; p.y += p.vy;
    p.vy += 0.05;
    p.life -= p.decay;
    return p.life > 0;
  });
}

function drawParticles() {
  state.particles.forEach(p => {
    ctx.globalAlpha = p.life;
    ctx.fillStyle = p.color;
    ctx.fillRect(Math.floor(p.x), Math.floor(p.y), Math.ceil(p.size), Math.ceil(p.size));
  });
  ctx.globalAlpha = 1;
}

// ===================== OBSTACLES =====================
// Escudos caem do céu como itens coletáveis
function spawnShield() {
  const x = 20 + Math.random() * (W - 60);
  state.obstacles.push({ x, y: -40, w: 20, h: 20, speed: 1.5 + Math.random(), type: 'shield', hp: 1, frame: 0, rot: 0 });
}

function drawShieldItem(x, y, frame) {
  ctx.save();
  ctx.translate(Math.floor(x) + 10, Math.floor(y) + 10);
  const glow = 0.7 + Math.sin(frame * 0.15) * 0.3;
  ctx.globalAlpha = glow;
  ctx.fillStyle = '#0066ff';
  ctx.fillRect(-8, -10, 16, 20);
  ctx.fillRect(-10, -6, 20, 12);
  ctx.fillStyle = '#44aaff';
  ctx.fillRect(-6, -8, 12, 16);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-3, -4, 6, 8);
  ctx.globalAlpha = 1;
  ctx.restore();
}

function spawnObstacle(phase) {
  const x = 20 + Math.random() * (W - 60);
  let type, w, h, speed, hp;

  // Velocidade aumenta progressivamente dentro da fase (0→1) e entre fases
  const phaseBonus = (phase - 1) * 1.2;
  const progressBonus = (state.phaseProgress / state.phaseDuration) * 1.5;
  const totalMult = 1 + phaseBonus * 0.4 + progressBonus * 0.4;

  if (phase <= 1) { type = 'bird'; w = 24; h = 12; speed = (2+Math.random()*1.5) * totalMult; hp = 1; }
  else if (phase <= 2) { type = 'plane'; w = 44; h = 20; speed = (2.5+Math.random()*2) * totalMult; hp = 2; }
  else if (phase <= 3) { type = 'satellite'; w = 32; h = 32; speed = (1.5+Math.random()*1.5) * totalMult; hp = 2; }
  else if (phase <= 4) { type = 'meteor'; w = 20+Math.random()*16|0; h = 20+Math.random()*16|0; speed = (2+Math.random()*2.5) * totalMult; hp = 2; }
  else if (phase <= 5) { type = 'asteroid'; w = 28+Math.random()*20|0; h = 28+Math.random()*20|0; speed = (2.5+Math.random()*3) * totalMult; hp = 3; }
  else { type = 'debris'; w = 18; h = 12; speed = (3+Math.random()*3) * totalMult; hp = 1; }

  state.obstacles.push({ x, y: -40, w, h, speed, type, hp, frame: 0, rot: Math.random()*Math.PI*2 });
}

// ===================== BACKGROUND by PHASE =====================
function drawBackground(phase) {
  const p = phase;
  let topColor, botColor;

  if (p <= 1) { topColor = '#0033aa'; botColor = '#6699ff'; }
  else if (p <= 2) { topColor = '#001166'; botColor = '#0033aa'; }
  else if (p <= 3) { topColor = '#000022'; botColor = '#001166'; }
  else if (p <= 4) { topColor = '#000008'; botColor = '#000022'; }
  else if (p <= 5) { topColor = '#000004'; botColor = '#000010'; }
  else { topColor = '#0a0004'; botColor = '#000008'; }

  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, topColor);
  grad.addColorStop(1, botColor);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Atmospheric glow for early phases
  if (p <= 2) {
    ctx.fillStyle = `rgba(100,150,255,${0.05 * (3-p)})`;
    ctx.fillRect(0, H-200, W, 200);
  }
}

// ===================== QUIZ SYSTEM =====================
// Modo aleatorio: digitacao (sem alternativas) ou alternativas clicaveis
// Se nave tomou dano (nextQuizForced=true): SEMPRE com alternativas
// Velocidade bônus de dano: quanto mais rapido, maior o multiplicador
let quizTimerInterval = null;
let quizTimeLeft = 30;
let quizAnswered = false;
let quizCorrectAnswer = '';
let quizCorrectIdx = 0;
let quizCallback = null;
let quizStartTime = 0;
let quizTimeLimit = 30;
let currentQuizOpts = [];
let quizModeMultipleChoice = false; // true = alternativas, false = digitacao

function calcDamageMultiplier(elapsed, timeLimit) {
  const ratio = elapsed / timeLimit;
  if (ratio <= 0.15) return 3.0;
  if (ratio <= 0.33) return 2.0;
  if (ratio <= 0.60) return 1.5;
  return 1.0;
}

function updateDmgDisplay(elapsed, timeLimit) {
  const mult = calcDamageMultiplier(elapsed, timeLimit);
  // dmgMultiplier oculto — sem exibir multiplicador
}

function normalize(str) {
  return str
    .toUpperCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function renderAnswerHint(typed, correct) {
  const display = document.getElementById('answerDisplay');
  let h = '';
  const up = normalize(typed);
  const cr = normalize(correct);
  for (let i = 0; i < up.length; i++) {
    if (i < cr.length && up[i] === cr[i]) {
      h += `<span class="correct-letter">${up[i]}</span>`;
    } else {
      h += `<span class="wrong-letter">${up[i]}</span>`;
    }
  }
  if (up.length < cr.length) {
    h += `<span style="color:#442200"> ${cr.slice(up.length)}</span>`;
  }
  display.innerHTML = h || '&nbsp;';
}

function showQuiz(isBoss, callback) {
  state.quizPending = true;
  quizCallback = callback;

  const pool = isBoss ? questionsByPhase.boss : getQuestionsForPhase(state.phase);
  let available = pool.filter((_, i) => !state.quizUsedQuestions.has(`${isBoss?'b':''}${i}`));
  if (available.length === 0) { state.quizUsedQuestions.clear(); available = pool; }

  const idx = Math.floor(Math.random() * available.length);
  const q = available[idx];
  state.quizUsedQuestions.add(`${isBoss?'b':''}${pool.indexOf(q)}`);

  quizTimeLimit = isBoss ? 20 : 30;
  quizTimeLeft = quizTimeLimit;
  quizAnswered = false;
  quizCorrectIdx = q.a;
  quizCorrectAnswer = q.opts[q.a];
  currentQuizOpts = q.opts;
  quizStartTime = Date.now();

  // Decidir modo: forçado = alternativas; boss = sempre alternativas; senão aleatório
  // boss → sempre alternativas; dano → sempre alternativas; senão: 40% digitação, 60% alternativas
  if (isBoss || state.nextQuizForced) {
    quizModeMultipleChoice = true;
  } else {
    quizModeMultipleChoice = Math.random() < 0.6; // 40% chance de ser digitação
  }
  state.nextQuizForced = false;

  const titleEl = document.getElementById('quizTitle');
  titleEl.textContent = isBoss ? '👾 DESAFIO DO BOSS!' : '⚠ NAVE DANIFICADA ⚠';
  titleEl.style.color = isBoss ? '#ff00ff' : '#ff2244';

  document.getElementById('quizTimer').textContent = quizTimeLimit;
  document.getElementById('timerFill').style.width = '100%';
  document.getElementById('timerFill').style.background = '#ff4400';
  document.getElementById('quizQuestion').textContent = q.q;
  document.getElementById('quizFeedback').textContent = '';
  document.getElementById('answerDisplay').innerHTML = '&nbsp;';
  document.getElementById('dmgMultiplier').textContent = '';

  const optsDiv = document.getElementById('quizOptions');
  const input = document.getElementById('speedInput');
  optsDiv.innerHTML = '';
  input.value = '';
  input.className = '';
  input.disabled = false;
  input.oninput = null;
  input.onkeydown = null;

  if (quizModeMultipleChoice) {
    // MODO ALTERNATIVAS — sem input de texto
    input.classList.add('hidden-input');
    document.getElementById('answerDisplay').innerHTML = '';
    document.getElementById('speedHint').textContent = '👆 Clique na alternativa correta!';
    q.opts.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'quiz-opt-btn';
      btn.id = 'opt_' + i;
      btn.textContent = ['A)', 'B)', 'C)', 'D)'][i] + ' ' + opt;
      btn.onclick = () => clickAnswer(i);
      optsDiv.appendChild(btn);
    });
  } else {
    // MODO DIGITAÇÃO — sem alternativas visíveis
    input.classList.remove('hidden-input');
    document.getElementById('speedHint').textContent = '⌨ Digite rápido! ENTER para confirmar';
    // Não mostra alternativas
    input.oninput = () => {
      const elapsed = (Date.now() - quizStartTime) / 1000;
      renderAnswerHint(input.value, quizCorrectAnswer);
      updateDmgDisplay(elapsed, quizTimeLimit);
    };
    input.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (!quizAnswered) submitTypedAnswer(); }
    };
  }

  document.getElementById('quizModal').classList.remove('hidden');
  const _mc = document.getElementById('mobileControls');
  if (_mc) _mc.style.display = 'none';
  setTimeout(() => { if (!quizModeMultipleChoice) input.focus(); }, 80);

  if (quizTimerInterval) clearInterval(quizTimerInterval);
  quizTimerInterval = setInterval(() => {
    const elapsed = (Date.now() - quizStartTime) / 1000;
    quizTimeLeft = Math.max(0, quizTimeLimit - elapsed);
    document.getElementById('quizTimer').textContent = Math.ceil(quizTimeLeft);
    const ratio = quizTimeLeft / quizTimeLimit;
    document.getElementById('timerFill').style.width = (ratio * 100) + '%';
    document.getElementById('timerFill').style.background = ratio > 0.5 ? '#ff4400' : ratio > 0.25 ? '#ff2200' : '#ff0000';
    if (!quizModeMultipleChoice) updateDmgDisplay(elapsed, quizTimeLimit);
    if (quizTimeLeft <= 0 && !quizAnswered) { clearInterval(quizTimerInterval); timeoutQuiz(); }
  }, 80);
}

// Clique em alternativa
function clickAnswer(idx) {
  if (quizAnswered) return;
  quizAnswered = true;
  clearInterval(quizTimerInterval);
  const elapsed = (Date.now() - quizStartTime) / 1000;
  const mult = calcDamageMultiplier(elapsed, quizTimeLimit);

  document.querySelectorAll('.quiz-opt-btn').forEach((b, i) => {
    b.classList.add(i === quizCorrectIdx ? 'correct' : 'reveal');
  });

  if (idx === quizCorrectIdx) {
    document.getElementById('opt_' + idx).classList.remove('reveal');
    document.getElementById('opt_' + idx).classList.add('correct');
    document.getElementById('quizFeedback').textContent = `✓ CORRETO! +${Math.round(state.phase * 100 * mult)} pts`;
    document.getElementById('quizFeedback').style.color = '#ff6600';
    state.correctAnswers++;
    state.score += Math.round(state.phase * 100 * mult);
    setTimeout(() => closeQuiz(true, mult), 1300);
  } else {
    document.getElementById('opt_' + idx).classList.remove('reveal');
    document.getElementById('opt_' + idx).classList.add('wrong');
    document.getElementById('quizFeedback').textContent = `✗ ERRADO! Correto: ${quizCorrectAnswer}`;
    document.getElementById('quizFeedback').style.color = '#ff2244';
    state.wrongAnswers++;
    setTimeout(() => closeQuiz(false, 1.0), 1300);
  }
}

// Confirmar resposta digitada
function submitTypedAnswer() {
  if (quizAnswered) return;
  const input = document.getElementById('speedInput');
  const typed = normalize(input.value);
  const correct = normalize(quizCorrectAnswer);
  const elapsed = (Date.now() - quizStartTime) / 1000;

  quizAnswered = true;
  clearInterval(quizTimerInterval);
  input.disabled = true;

  const mult = calcDamageMultiplier(elapsed, quizTimeLimit);

  if (typed === correct) {
    document.getElementById('quizFeedback').textContent =
      `✓ CORRETO! ×${mult.toFixed(1)} bônus! +${Math.round(state.phase * 100 * mult)} pts`;
    document.getElementById('quizFeedback').style.color = '#ff6600';
    state.correctAnswers++;
    state.score += Math.round(state.phase * 100 * mult);
    setTimeout(() => closeQuiz(true, mult), 1300);
  } else {
    input.classList.add('shake');
    document.getElementById('quizFeedback').textContent = `✗ ERRADO! Correto: ${quizCorrectAnswer}`;
    document.getElementById('quizFeedback').style.color = '#ff2244';
    state.wrongAnswers++;
    setTimeout(() => closeQuiz(false, 1.0), 1300);
  }
}

function timeoutQuiz() {
  if (quizAnswered) return;
  quizAnswered = true;
  const input = document.getElementById('speedInput');
  input.disabled = true;
  document.getElementById('quizFeedback').textContent = '⏱ TEMPO ESGOTADO! Dano total!';
  document.getElementById('quizFeedback').style.color = '#ff8800';
  if (quizModeMultipleChoice) {
    const el = document.getElementById('opt_' + quizCorrectIdx);
    if (el) { el.classList.remove('reveal'); el.classList.add('correct'); }
  }
  state.wrongAnswers++;
  setTimeout(() => closeQuiz(false, 1.0), 1300);
}

function closeQuiz(success, mult) {
  document.getElementById('quizModal').classList.add('hidden');
  const mc = document.getElementById('mobileControls');
  if (mc) mc.style.display = '';
  const input = document.getElementById('speedInput');
  input.oninput = null;
  input.onkeydown = null;
  state.quizPending = false;
  if (quizCallback) quizCallback(success, mult || 1.0);
  quizCallback = null;
}

// ===================== DAMAGE & REPAIR =====================
function takeDamage(amount) {
  if (state.invincible > 0) return;
  // Escudo absorve o dano
  if (state.shields > 0) {
    state.shields--;
    updateShieldUI();
    state.nextQuizForced = true;
    state.invincible = 60;
    spawnParticles(state.ship.x + 20, state.ship.y + 25, '#0088ff', 14);
    return;
  }
  state.health = Math.max(0, state.health - amount);
  state.damageFlash = 10;
  state.invincible = 120;
  state.nextQuizForced = true;
  updateHealthUI();

  spawnParticles(state.ship.x + 20, state.ship.y + 25, '#ff4400', 12);

  if (state.health <= 0) {
    endGame(false);
    return;
  }

  showQuiz(false, (success, mult) => {
    if (success) {
      const repairAmt = Math.round(20 * (mult || 1.0));
      state.health = Math.min(100, state.health + repairAmt);
      updateHealthUI();
      spawnParticles(state.ship.x + 20, state.ship.y + 25, '#ff6600', Math.round(10 * (mult||1)));
    } else {
      state.health = Math.max(0, state.health - 15);
      updateHealthUI();
      if (state.health <= 0) endGame(false);
    }
  });
}

function updateShieldUI() {
  const el = document.getElementById('shieldVal');
  if (el) {
    el.textContent = state.shields > 0 ? 'SIM' : 'NÃO';
    el.style.color  = state.shields > 0 ? '#44aaff' : '#666';
  }
}

function updateHealthUI() {
  const pct = state.health;
  document.getElementById('healthFill').style.width = pct + '%';
  document.getElementById('healthFill').style.background =
    pct > 60 ? '#ff2200' : pct > 30 ? '#ff5500' : '#ff0000';
  document.getElementById('healthVal').textContent = pct + '%';
  document.getElementById('answersVal').textContent = `✓${state.correctAnswers} ✗${state.wrongAnswers}`;
  document.getElementById('scoreVal').textContent = 'PTS: ' + state.score;
  updateShieldUI();
}

// ===================== PHASE SYSTEM =====================
let phaseAnnounceTimer = 0;

const phaseNames = [
  '', 'FASE 1: ATMOSFERA', 'FASE 2: NUVENS ALTAS',
  'FASE 3: ÓRBITA BAIXA', 'FASE 4: CINTURÃO DE METEORITOS',
  'FASE 5: ESPAÇO PROFUNDO', 'FASE 6: ÓRBITA DE MARTE',
  'BOSS: ALIENÍGENA!'
];

function announcePhase(name) {
  const el = document.getElementById('phaseAnnounce');
  document.getElementById('phaseAnnounceText').textContent = name;
  el.classList.add('show');
  phaseAnnounceTimer = 120;
}

function advancePhase() {
  state.phase++;
  state.phaseProgress = 0;
  state.obstacles = [];

  if (state.phase > state.totalPhases) {
    // Start boss
    state.bossActive = true;
    state.bossHealth = 100;
    bossAttackTimer = -180; // 3s de graça antes da primeira pergunta
    document.getElementById('bossHud').classList.remove('hidden');
    document.getElementById('phaseLabel').textContent = 'BOSS!';
    announcePhase(phaseNames[7]);
  } else {
    document.getElementById('phaseLabel').textContent = 'FASE ' + state.phase;
    announcePhase(phaseNames[state.phase]);
  }
}

// ===================== BOSS LOGIC =====================
// Perguntas aparecem automaticamente a cada intervalo.
// Acertou → boss perde 25 HP | Errou/Tempo → player perde 20 HP
let bossAttackTimer = 0;
const BOSS_QUIZ_INTERVAL = 280; // frames entre perguntas (~4.5s a 60fps)

function triggerBossQuiz() {
  spawnParticles(state.bossX + 40, state.bossY + 80, '#ff00ff', 14);
  spawnParticles(state.ship.x + 20, state.ship.y + 10, '#ff00ff', 10);

  showQuiz(true, (success, mult) => {
    if (success) {
      // Acertou → boss perde vida (mais rápido = mais dano)
      const bossDmg = 10; // fixo: ~10 acertos para matar o boss
      state.bossHealth = Math.max(0, state.bossHealth - bossDmg);
      document.getElementById('bossHealthFill').style.width = state.bossHealth + '%';
      spawnParticles(state.bossX + 40, state.bossY + 40, '#ff6600', Math.min(30, Math.round(12 * (mult||1))));
      state.score += Math.round(500 * (mult || 1.0));
      updateHealthUI();
      if (state.bossHealth <= 0) endGame(true);
    } else {
      // Errou → player perde vida
      state.health = Math.max(0, state.health - 20);
      state.damageFlash = 14;
      spawnParticles(state.ship.x + 20, state.ship.y + 25, '#ff0000', 14);
      updateHealthUI();
      if (state.health <= 0) endGame(false);
    }
  });
}

function bossFight() {
  // Boss se move lado a lado
  state.bossX += state.bossDir * 1.5;
  if (state.bossX > W - 80 || state.bossX < 0) state.bossDir *= -1;

  // Conta frames e dispara pergunta automaticamente
  if (!state.quizPending) {
    bossAttackTimer++;
    if (bossAttackTimer >= BOSS_QUIZ_INTERVAL) {
      bossAttackTimer = 0;
      triggerBossQuiz();
    }
  }
}

// ===================== INPUT =====================
document.addEventListener('keydown', e => { state.keys[e.key] = true; });
document.addEventListener('keyup', e => { state.keys[e.key] = false; });

// Controles mobile por toque
(function setupMobile() {
  function setKey(key, val) { state.keys[key] = val; }
  const btnL = document.getElementById('btnLeft');
  const btnR = document.getElementById('btnRight');
  if (btnL) {
    btnL.addEventListener('touchstart', e => { e.preventDefault(); setKey('ArrowLeft', true); }, { passive: false });
    btnL.addEventListener('touchend',   e => { e.preventDefault(); setKey('ArrowLeft', false); }, { passive: false });
    btnL.addEventListener('mousedown',  () => setKey('ArrowLeft', true));
    btnL.addEventListener('mouseup',    () => setKey('ArrowLeft', false));
    btnL.addEventListener('mouseleave', () => setKey('ArrowLeft', false));
  }
  if (btnR) {
    btnR.addEventListener('touchstart', e => { e.preventDefault(); setKey('ArrowRight', true); }, { passive: false });
    btnR.addEventListener('touchend',   e => { e.preventDefault(); setKey('ArrowRight', false); }, { passive: false });
    btnR.addEventListener('mousedown',  () => setKey('ArrowRight', true));
    btnR.addEventListener('mouseup',    () => setKey('ArrowRight', false));
    btnR.addEventListener('mouseleave', () => setKey('ArrowRight', false));
  }
})();

function handleInput() {
  if (state.quizPending) return;
  const left = state.keys['ArrowLeft'] || state.keys['a'] || state.keys['A'];
  const right = state.keys['ArrowRight'] || state.keys['d'] || state.keys['D'];
  if (left) state.ship.x = Math.max(0, state.ship.x - state.ship.speed);
  if (right) state.ship.x = Math.min(W - 40, state.ship.x + state.ship.speed);
}

// ===================== MAIN LOOP =====================
let frameCount = 0;
let lastObstacleSpawn = 0;

function gameLoop() {
  if (gameState !== 'playing') return;
  frameCount++;

  handleInput();

  if (state.invincible > 0) state.invincible--;
  if (state.damageFlash > 0) state.damageFlash--;
  if (phaseAnnounceTimer > 0) {
    phaseAnnounceTimer--;
    if (phaseAnnounceTimer === 0) {
      document.getElementById('phaseAnnounce').classList.remove('show');
    }
  }

  // Draw background
  drawBackground(state.phase);

  // Draw stars
  drawStars(state.phase);

  // Mars approaching
  if (state.phase === 6) drawMars(state.phaseProgress / state.phaseDuration);

  // Advance phase
  if (!state.bossActive && !state.quizPending) {
    state.phaseProgress++;
    if (state.phaseProgress >= state.phaseDuration) advancePhase();
  }

  // Spawn obstacles
  if (!state.bossActive && !state.quizPending) {
    const spawnRate = Math.max(20, 80 - state.phase * 8);
    if (frameCount - lastObstacleSpawn > spawnRate) {
      spawnObstacle(state.phase);
      lastObstacleSpawn = frameCount;
    }
    // Escudos: aparecem a cada ~500 frames (chance aleatória)
    if (frameCount % 500 === 0 && Math.random() < 0.7) spawnShield();
  }

  // Update + draw obstacles
  state.obstacles = state.obstacles.filter(obs => {
    obs.y += obs.speed;
    obs.frame++;
    obs.rot += 0.02;

    // Escudo: coleta e remove
    if (obs.type === 'shield') {
      drawShieldItem(obs.x, obs.y, obs.frame);
      // Coleta por colisão com a nave
      if (obs.x < state.ship.x + 38 && obs.x + obs.w > state.ship.x + 2 &&
          obs.y < state.ship.y + 48 && obs.y + obs.h > state.ship.y + 4) {
        state.shields = 1; // escudo não acumulativo: apenas 1 ativo por vez
        updateShieldUI();
        spawnParticles(obs.x + 10, obs.y + 10, '#0088ff', 16);
        return false;
      }
      return obs.y < H + 40;
    }

    // Draw obstáculos normais
    if (obs.type === 'bird') drawBird(obs.x, obs.y, obs.frame);
    else if (obs.type === 'plane') drawPlane(obs.x, obs.y);
    else if (obs.type === 'satellite') drawSatellite(obs.x, obs.y, obs.rot);
    else if (obs.type === 'meteor') drawMeteor(obs.x, obs.y, obs.w);
    else if (obs.type === 'asteroid') drawAsteroid(obs.x, obs.y, obs.w);
    else if (obs.type === 'debris') drawDebris(obs.x, obs.y);

    // Collision with ship
    if (!state.quizPending && state.invincible <= 0 &&
        obs.x < state.ship.x + 36 && obs.x + obs.w > state.ship.x + 4 &&
        obs.y < state.ship.y + 46 && obs.y + obs.h > state.ship.y + 8) {
      spawnParticles(obs.x + obs.w/2, obs.y + obs.h/2, '#ff6600', 10);
      takeDamage(12 + state.phase * 3);
      return false;
    }

    return obs.y < H + 60;
  });

  // Boss
  if (state.bossActive && !state.quizPending) {
    bossFight();
    drawBoss(state.bossX, state.bossY, state.bossHealth);

  }

  // Particles
  updateParticles();
  drawParticles();

  // Ship (with damage flash)
  if (state.invincible <= 0 || Math.floor(state.invincible / 6) % 2 === 0) {
    drawShip(state.ship.x, state.ship.y, state.damageFlash);
  }

  // Damage flash overlay
  if (state.damageFlash > 0) {
    ctx.fillStyle = `rgba(255,0,0,${state.damageFlash * 0.04})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Phase progress bar
  if (!state.bossActive) {
    const progress = state.phaseProgress / state.phaseDuration;
    ctx.fillStyle = '#111';
    ctx.fillRect(10, H - 14, W - 20, 6);
    ctx.fillStyle = '#ff2200';
    ctx.fillRect(10, H - 14, (W - 20) * progress, 6);
    ctx.fillStyle = '#ff2200';
    ctx.fillRect(W - 18, H - 20, 6, 12);
  }

  animFrame = requestAnimationFrame(gameLoop);
}

// ===================== TROPHY DRAWING =====================
function drawTrophy() {
  const tc = document.getElementById('trophyCanvas');
  const tx = tc.getContext('2d');
  const w = tc.width, h = tc.height;
  tx.clearRect(0, 0, w, h);

  // Monitor
  tx.fillStyle = '#1a1a2e';
  tx.fillRect(50, 10, 100, 70);
  tx.fillStyle = '#ff2200';
  tx.fillRect(55, 15, 90, 60);

  // Linux penguin on screen (Tux pixel art)
  tx.fillStyle = '#000';
  tx.fillRect(75, 20, 50, 50);
  // Tux body
  tx.fillStyle = '#000';
  tx.fillRect(82, 28, 36, 36);
  tx.fillStyle = '#fff';
  tx.fillRect(86, 36, 28, 24);
  // Tux head
  tx.fillStyle = '#000';
  tx.fillRect(86, 22, 28, 18);
  tx.fillStyle = '#ffaa00';
  tx.fillRect(94, 32, 12, 6);
  // Eyes
  tx.fillStyle = '#fff';
  tx.fillRect(89, 24, 6, 6);
  tx.fillRect(105, 24, 6, 6);
  tx.fillStyle = '#000';
  tx.fillRect(91, 26, 3, 3);
  tx.fillRect(107, 26, 3, 3);

  // Screen text
  tx.fillStyle = '#ff2200';
  tx.font = '5px "Press Start 2P"';
  tx.fillText('LINUX', 78, 76);

  // Monitor stand
  tx.fillStyle = '#334455';
  tx.fillRect(88, 80, 24, 10);
  tx.fillRect(75, 88, 50, 6);

  // Trophy cup
  tx.fillStyle = '#ffcc00';
  tx.fillRect(80, 100, 40, 30);
  tx.fillRect(75, 95, 50, 12);
  tx.fillRect(93, 130, 14, 10);
  tx.fillRect(83, 138, 34, 6);

  // Star on trophy
  tx.fillStyle = '#fff';
  tx.font = '14px serif';
  tx.fillText('★', 91, 122);

  // Glow
  tx.fillStyle = 'rgba(255,220,0,0.08)';
  tx.fillRect(60, 90, 80, 60);
}

// ===================== GAME FLOW =====================
function startGame() {
  // Reset state
  Object.assign(state, {
    ship: { x: 220, y: 520, w: 40, h: 50, speed: 5, flame: 0 },
    health: 100,
    score: 0,
    phase: 1,
    phaseProgress: 0,
    phaseDuration: 3200,
    obstacles: [],
    particles: [],
    bossHealth: 100,
    bossX: 200, bossY: 80,
    bossDir: 1,
    bossActive: false,
    bossProjectiles: [],
    shields: 0,
    nextQuizForced: false,
    keys: {},
    correctAnswers: 0,
    wrongAnswers: 0,
    quizPending: false,
    invincible: 60,
    damageFlash: 0,
    quizUsedQuestions: new Set(),
    bossQuizCount: 0,
  });

  frameCount = 0;
  lastObstacleSpawn = 0;
  bossAttackTimer = 0;

  document.getElementById('menuScreen').classList.add('hidden');
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('winScreen').classList.add('hidden');
  document.getElementById('instrScreen').classList.add('hidden');
  document.getElementById('quizModal').classList.add('hidden');
  document.getElementById('bossHud').classList.add('hidden');
  document.getElementById('phaseLabel').textContent = 'FASE 1';

  updateHealthUI();

  gameState = 'playing';
  cancelAnimationFrame(animFrame);
  announcePhase(phaseNames[1]);
  gameLoop();
}

function endGame(won) {
  gameState = won ? 'win' : 'gameover';
  cancelAnimationFrame(animFrame);
  clearInterval(quizTimerInterval);
  document.getElementById('quizModal').classList.add('hidden');
  document.getElementById('bossHud').classList.add('hidden');

  if (won) {
    document.getElementById('winScreen').classList.remove('hidden');
    document.getElementById('winMsg').textContent =
      `Respostas: ✓${state.correctAnswers} ✗${state.wrongAnswers}`;
    document.getElementById('winScore').textContent = `PONTUAÇÃO FINAL: ${state.score} PTS`;
    drawTrophy();
  } else {
    document.getElementById('gameOverScreen').classList.remove('hidden');
    document.getElementById('gameOverMsg').textContent =
      state.phase <= 2 ? 'Nave destruída na atmosfera...' :
      state.phase <= 4 ? 'Destruída no espaço profundo...' :
      state.bossActive ? 'Derrotado pelo alienígena...' : 'Destruída próximo a Marte...';
    document.getElementById('finalScore').textContent =
      `Fase ${state.phase} | PTS: ${state.score} | ✓${state.correctAnswers} ✗${state.wrongAnswers}`;
  }
}

function showMenu() {
  gameState = 'menu';
  cancelAnimationFrame(animFrame);
  clearInterval(quizTimerInterval);
  document.getElementById('quizModal').classList.add('hidden');
  document.getElementById('gameOverScreen').classList.add('hidden');
  document.getElementById('winScreen').classList.add('hidden');
  document.getElementById('bossHud').classList.add('hidden');
  document.getElementById('phaseAnnounce').classList.remove('show');
  document.getElementById('menuScreen').classList.remove('hidden');
  ctx.clearRect(0, 0, W, H);

  // Draw menu background
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, '#000008');
  grad.addColorStop(1, '#001133');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);
  drawStars(3);
}

function showInstructions() {
  document.getElementById('menuScreen').classList.add('hidden');
  document.getElementById('instrScreen').classList.remove('hidden');
}

function hideInstructions() {
  document.getElementById('instrScreen').classList.add('hidden');
  document.getElementById('menuScreen').classList.remove('hidden');
}

// Initial menu render
showMenu();